@echo off
echo ========================================
echo NFC Card Scanner Test Tool
echo ========================================
echo.
echo This tool will connect to the NFC service
echo and display card scans in real-time.
echo.
echo Make sure the NFC service is running first!
echo (Run: start-nfc-service.bat)
echo.
pause
echo.
node test-scanner.js
pause

