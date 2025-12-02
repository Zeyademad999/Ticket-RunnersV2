@echo off
echo Starting NFC Bridge Server...
echo.
echo Choose an option:
echo 1. Simple mode (no hardware - for testing)
echo 2. Full mode (with NFC hardware)
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Starting in SIMULATION mode...
    python nfc_server_simple.py
) else if "%choice%"=="2" (
    echo.
    echo Starting with NFC hardware...
    python nfc_server.py
) else (
    echo Invalid choice. Starting in simple mode...
    python nfc_server_simple.py
)

pause



