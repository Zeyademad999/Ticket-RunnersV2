@echo off
echo ========================================
echo Starting NFC Bridge Service
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Please run this script from the nfc-bridge-server directory
    pause
    exit /b 1
)

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo Starting NFC Service...
echo.

REM Try to start with full NFC support first
REM Check if nfc-pcsc package exists by trying to require it
node -e "require('nfc-pcsc')" >nul 2>&1
if errorlevel 1 goto :simple_mode

echo Using full NFC support (nfc-pcsc)...
echo WebSocket Server: ws://localhost:9090
echo HTTP Status Server: http://localhost:8765
echo.
echo Press Ctrl+C to stop the service
echo ========================================
echo.
node nfc-service.js
goto :end

:simple_mode
echo Full NFC support not available (nfc-pcsc not installed)
echo Starting in Simple Mode (Manual Input)...
echo.
echo WebSocket Server: ws://localhost:9090
echo HTTP Status Server: http://localhost:8765
echo.
echo In Simple Mode, you can:
echo   1. Type card UID in this console and press Enter
echo   2. POST to http://localhost:8765/scan with: {"uid": "CARD123"}
echo.
echo Press Ctrl+C to stop the service
echo ========================================
echo.
node nfc-service-simple.js

:end

pause

