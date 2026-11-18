$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node.exe).Source
Push-Location -LiteralPath $projectRoot
try {
  $safeConfig = & $nodePath (Join-Path $PSScriptRoot 'local-config.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Project configuration is invalid. Check backend/.env.' }
  $config = $safeConfig | ConvertFrom-Json
  $siteUri = [Uri]$config.origin
  if ($siteUri.Host -notin @('localhost','127.0.0.1')) { throw 'This launcher is for the local site only.' }
  $service = Get-Service MySQLAyham2003 -ErrorAction SilentlyContinue
  if ($service -and $service.Status -ne 'Running') { Start-Service MySQLAyham2003 }
  $modelLauncher = Join-Path (Split-Path $projectRoot) 'local-ai-runtime\start-local-ai.ps1'
  if (Test-Path -LiteralPath $modelLauncher) {
    try { $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 1 }
    catch { Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$modelLauncher`"" -WindowStyle Hidden }
  }
  $apiHealth = $null
  try { $apiHealth = Invoke-RestMethod "http://127.0.0.1:$($config.port)/api/health" -TimeoutSec 3 } catch {}
  if ($apiHealth -and $apiHealth.data.planningMode -ne 'agent') { throw 'An older backend is using this port. Stop it before starting the updated project.' }
  if ($apiHealth) {
    foreach ($mode in $config.modes.PSObject.Properties) {
      if ($apiHealth.data.services.($mode.Name) -ne $mode.Value) { throw 'Running backend settings differ from backend/.env. Restart the backend before continuing.' }
    }
  }
  if (-not $apiHealth) {
    Start-Process -FilePath $nodePath -ArgumentList ('"' + (Join-Path $projectRoot 'backend\src\server.js') + '"') -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot 'backend-local.log') -RedirectStandardError (Join-Path $projectRoot 'backend-local-error.log')
  }
  $frontendReady = $false
  try { $frontendReady = (Invoke-WebRequest $config.origin -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch {}
  if (-not $frontendReady) {
    Start-Process -FilePath $nodePath -ArgumentList 'node_modules/vite/bin/vite.js','--config','frontend/vite.config.js','--host','127.0.0.1','--port',([string]$siteUri.Port),'frontend' -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot 'frontend-local.log') -RedirectStandardError (Join-Path $projectRoot 'frontend-local-error.log')
  }
  for ($attempt = 0; $attempt -lt 15; $attempt++) {
    try {
      $ready = Invoke-RestMethod "$($config.origin)/api/health" -TimeoutSec 2
      if ($ready.data.status -eq 'ok' -and $ready.data.planningMode -eq 'agent') { Write-Output "Gilgamish Smart is ready: $($config.origin)"; exit 0 }
    } catch {}
    Start-Sleep -Seconds 1
  }
  throw 'Site did not become ready. Inspect backend-local-error.log and frontend-local-error.log.'
} finally { Pop-Location }
