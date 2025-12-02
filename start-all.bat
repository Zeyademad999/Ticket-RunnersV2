@echo off
echo ========================================
echo Ticket Runners - Complete Startup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Starting all services...
echo.

REM Start NFC Service in a new window
echo [1/3] Starting NFC Bridge Service...
start "NFC Bridge Service" cmd /k "cd nfc-bridge-server && call start-nfc-service.bat"

REM Wait a bit for NFC service to start
timeout /t 3 /nobreak >nul

REM Start Backend (if exists)
if exist "backend\manage.py" (
    echo [2/3] Starting Django Backend...
    start "Django Backend" cmd /k "cd backend && python manage.py runserver"
    timeout /t 2 /nobreak >nul
) else (
    echo [2/3] Backend not found, skipping...
)

REM Start Admin Dashboard
if exist "frontend\admin-dashboard\package.json" (
    echo [3/3] Starting Admin Dashboard...
    start "Admin Dashboard" cmd /k "cd frontend\admin-dashboard && npm run dev"
) else (
    echo [3/3] Admin Dashboard not found, skipping...
)

echo.
echo ========================================
echo All services are starting...
echo ========================================
echo.
echo NFC Service: http://localhost:8765
echo Admin Dashboard: http://localhost:8081
echo.
echo Check the opened windows for each service
echo Press any key to exit this window (services will keep running)
pause >nul



