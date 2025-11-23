@echo off
echo ========================================
echo Starting NFC Card Management System
echo ========================================
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Starting NFC Bridge Service...
start "NFC Bridge Service" cmd /k "cd nfc-bridge-server && call start-nfc-service.bat"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Django Backend...
if exist "backend\manage.py" (
    start "Django Backend" cmd /k "cd backend && python manage.py runserver"
    timeout /t 2 /nobreak >nul
) else (
    echo Backend not found, skipping...
)

echo [3/3] Starting Admin Dashboard...
if exist "frontend\admin-dashboard\package.json" (
    start "Admin Dashboard" cmd /k "cd frontend\admin-dashboard && npm run dev"
) else (
    echo Admin Dashboard not found, skipping...
)

echo.
echo ========================================
echo All services are starting!
echo ========================================
echo.
echo NFC Service: ws://localhost:9090
echo Admin Dashboard: http://localhost:8081
echo.
echo Open the Admin Dashboard and go to NFC Card Management
echo Place a card on the reader - it will be auto-added!
echo.
pause


