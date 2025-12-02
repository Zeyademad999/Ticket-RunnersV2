@echo off
echo ========================================
echo Installing Visual Studio Build Tools
echo ========================================
echo.
echo This will install the C++ build tools needed for nfc-pcsc
echo Installation may take 10-20 minutes...
echo.
echo Please wait...
echo.

winget install Microsoft.VisualStudio.2022.BuildTools --silent --accept-package-agreements --accept-source-agreements --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ Installation Complete!
    echo ========================================
    echo.
    echo IMPORTANT: You must RESTART your computer now!
    echo.
    echo After restart:
    echo   1. Open a NEW terminal
    echo   2. cd nfc-bridge-server
    echo   3. npm install nfc-pcsc
    echo   4. start-nfc-service.bat
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ Installation Failed
    echo ========================================
    echo.
    echo Please install manually:
    echo   1. Go to: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
    echo   2. Download and run the installer
    echo   3. Select "Desktop development with C++" workload
    echo   4. Install and restart
    echo.
)

pause

