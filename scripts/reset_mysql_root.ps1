# Reset MySQL 9.3 root password
# Run this script as Administrator

$ErrorActionPreference = "Stop"
$mysqlDir = "C:\Program Files\MySQL\MySQL Server 9.3"
$dataDir = "C:\ProgramData\MySQL\MySQL Server 9.3\Data"
$initFile = "$env:TEMP\mysql_init.sql"

Write-Host "=== MySQL 9.3 Root Password Reset ===" -ForegroundColor Cyan

# Step 1: Create init file
$initSql = @"
ALTER USER 'root'@'localhost' IDENTIFIED BY 'GilgamishLocal2026!Pass';
CREATE DATABASE IF NOT EXISTS gilgamish CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'gilgamish'@'localhost' IDENTIFIED BY 'GilgamishLocal2026!Pass';
GRANT ALL PRIVILEGES ON gilgamish.* TO 'gilgamish'@'localhost';
FLUSH PRIVILEGES;
"@
Set-Content -Path $initFile -Value $initSql -Encoding UTF8
Write-Host "[OK] Init file created at $initFile" -ForegroundColor Green

# Step 2: Stop MySQL
Write-Host "Stopping MySQL93..." -ForegroundColor Yellow
Stop-Service MySQL93 -Force
Start-Sleep -Seconds 3
Write-Host "[OK] MySQL93 stopped" -ForegroundColor Green

# Step 3: Start with --init-file
Write-Host "Starting MySQL with init-file..." -ForegroundColor Yellow
$process = Start-Process -FilePath "$mysqlDir\bin\mysqld.exe" -ArgumentList "--init-file=`"$initFile`"", "--console" -PassThru -NoNewWindow
Start-Sleep -Seconds 10

# Step 4: Test connection
Write-Host "Testing connection..." -ForegroundColor Yellow
$result = & "$mysqlDir\bin\mysql.exe" -u root "-pGilgamishLocal2026!Pass" --port=3306 -e "SELECT 'SUCCESS' AS status;" 2>&1
Write-Host $result

# Step 5: Kill the mysqld process and restart service
Write-Host "Restarting MySQL as service..." -ForegroundColor Yellow
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Start-Service MySQL93
Write-Host "[OK] MySQL93 service restarted" -ForegroundColor Green

# Cleanup
Remove-Item $initFile -ErrorAction SilentlyContinue
Write-Host "=== DONE ===" -ForegroundColor Cyan
