@echo off
echo ========================================
echo Install Visual Studio Build Tools
echo ========================================
echo.
echo This will help you install the build tools needed for nfc-pcsc
echo.
echo Option 1: Automatic (using winget - if available)
echo Option 2: Manual download and install
echo.
pause
echo.

REM Check if winget is available
where winget >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [Option 1] Found winget - attempting automatic installation...
    echo.
    echo This will install Visual Studio Build Tools 2022
    echo It may take 10-20 minutes...
    echo.
    set /p install="Do you want to install automatically? (Y/N): "
    if /i "%install%"=="Y" (
        echo.
        echo Installing Visual Studio Build Tools...
        winget install Microsoft.VisualStudio.2022.BuildTools --silent --accept-package-agreements --accept-source-agreements
        if %ERRORLEVEL% EQU 0 (
            echo.
            echo ✅ Installation started!
            echo Please wait for it to complete, then RESTART your computer.
            echo After restart, run: npm install nfc-pcsc
            pause
            exit /b 0
        ) else (
            echo.
            echo ❌ Automatic installation failed. Use manual method below.
            echo.
        )
    )
)

echo.
echo [Option 2] Manual Installation
echo.
echo Step 1: Download Visual Studio Build Tools
echo.
echo Opening download page in your browser...
start https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
echo.
echo Step 2: In the installer:
echo   1. Select "Desktop development with C++" workload
echo   2. Make sure these are checked:
echo      - MSVC v143 - VS 2022 C++ x64/x86 build tools
echo      - Windows 10/11 SDK (latest version)
echo   3. Click Install
echo   4. Wait for installation (10-20 minutes)
echo   5. RESTART your computer
echo.
echo Step 3: After restart, run:
echo   cd nfc-bridge-server
echo   npm install nfc-pcsc
echo.
echo Step 4: Start the service:
echo   start-nfc-service.bat
echo.
pause

