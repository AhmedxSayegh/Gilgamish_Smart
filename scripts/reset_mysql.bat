@echo off
echo ============================================
echo   MySQL 8.0 Root Password Reset
echo   Run this as Administrator!
echo ============================================
echo.

REM Step 1: Stop BOTH MySQL services
echo [1/4] Stopping MySQL services...
net stop MySQL93 2>nul
net stop MySQL80 2>nul
timeout /t 5 /nobreak > nul
echo.

REM Step 2: Start mysqld with skip-grant-tables + named pipe (TCP is disabled by skip-grant-tables on Windows)
echo [2/4] Starting MySQL 8.0 in safe mode via named pipe...
start /b "" "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.0\my.ini" --skip-grant-tables --enable-named-pipe --console
timeout /t 15 /nobreak > nul
echo.

REM Step 3: Connect via named pipe, reset password and create DB
echo [3/4] Resetting password and creating database...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root --pipe -e "FLUSH PRIVILEGES; ALTER USER 'root'@'localhost' IDENTIFIED BY 'GilgamishLocal2026!Pass'; CREATE DATABASE IF NOT EXISTS gilgamish CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; CREATE USER IF NOT EXISTS 'gilgamish'@'localhost' IDENTIFIED BY 'GilgamishLocal2026!Pass'; GRANT ALL PRIVILEGES ON gilgamish.* TO 'gilgamish'@'localhost'; FLUSH PRIVILEGES; SELECT 'PASSWORD RESET OK' AS result;"
echo.

REM Step 4: Kill mysqld and restart as service
echo [4/4] Restarting MySQL services...
taskkill /f /im mysqld.exe > nul 2>&1
timeout /t 5 /nobreak > nul
net start MySQL80
net start MySQL93
timeout /t 3 /nobreak > nul
echo.

REM Final verify via TCP
echo --- Verifying root on port 33061 ---
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root "-pGilgamishLocal2026!Pass" --port=33061 -e "SHOW DATABASES;"
echo.
echo --- Verifying gilgamish user ---
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u gilgamish "-pGilgamishLocal2026!Pass" --port=33061 -e "USE gilgamish; SELECT 'ALL GOOD!' AS result;"
echo.
echo ============================================
echo   DONE! Press any key to close...
echo ============================================
pause > nul
