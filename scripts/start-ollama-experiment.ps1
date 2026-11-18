$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeRoot = 'D:\Codex-Sarh-Technology\local-ai-runtime'
$model = 'qwen3:4b-instruct'

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $runtimeRoot 'start-local-ai.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Could not start the local Ollama runtime.' }
$availableModels = (Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5).models.name
if ($model -notin $availableModels) { throw "The prepared local model $model is unavailable." }

try {
  $health = Invoke-RestMethod 'http://127.0.0.1:4001/api/health' -TimeoutSec 3
  if ($health.data.aiMode -eq 'qwen') { Write-Output 'Gilgamish Smart Ollama experiment is ready: http://127.0.0.1:4001'; exit 0 }
  throw 'Port 4001 is already in use by another app.'
} catch {
  if ($_.Exception.Message -like 'Port 4001*') { throw }
}

$mysql = Get-Service MySQLAyham2003 -ErrorAction SilentlyContinue
if ($mysql -and $mysql.Status -ne 'Running') { Start-Service MySQLAyham2003 }
$env:PORT = '4001'
$env:CLIENT_ORIGIN = 'http://localhost:4001'
$env:NODE_ENV = 'development'
$env:AI_PROVIDER = 'qwen'
$env:OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
$env:OLLAMA_MODEL = $model
$env:OLLAMA_TIMEOUT_MS = '180000'

$appProcess = Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'scripts/serve.mjs' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeRoot 'experiment-app.log') -RedirectStandardError (Join-Path $runtimeRoot 'experiment-app-error.log')
$appProcess.Id | Set-Content -LiteralPath (Join-Path $runtimeRoot 'experiment-app.pid')
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Seconds 1
  if ($appProcess.HasExited) { throw 'The experiment app failed to start. Check experiment-app-error.log.' }
  try {
    $health = Invoke-RestMethod 'http://localhost:4001/api/health' -TimeoutSec 3
    if ($health.data.status -eq 'ok' -and $health.data.aiMode -eq 'qwen') {
      Write-Output 'Gilgamish Smart Ollama experiment is ready: http://localhost:4001'
      exit 0
    }
  } catch {}
}
throw 'The Ollama experiment did not become ready. Check experiment-app-error.log.'
