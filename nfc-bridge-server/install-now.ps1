# PowerShell script to install Visual Studio Build Tools
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing Visual Studio Build Tools" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will install the C++ build tools needed for nfc-pcsc" -ForegroundColor Yellow
Write-Host "Installation may take 10-20 minutes..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting installation..." -ForegroundColor Green
Write-Host ""

# Check if winget is available
$wingetPath = Get-Command winget -ErrorAction SilentlyContinue
if (-not $wingetPath) {
    Write-Host "❌ winget not found. Please install manually:" -ForegroundColor Red
    Write-Host "   https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Install Build Tools
Write-Host "Installing Microsoft Visual Studio 2022 Build Tools..." -ForegroundColor Green
$result = winget install --id Microsoft.VisualStudio.2022.BuildTools --silent --accept-package-agreements --accept-source-agreements --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Installation Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: You must RESTART your computer now!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After restart, run these commands:" -ForegroundColor Cyan
    Write-Host "  cd nfc-bridge-server" -ForegroundColor White
    Write-Host "  npm install nfc-pcsc" -ForegroundColor White
    Write-Host "  .\start-nfc-service.bat" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Installation Failed or Already Installed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please try manual installation:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022" -ForegroundColor White
    Write-Host "  2. Download and run the installer" -ForegroundColor White
    Write-Host "  3. Select 'Desktop development with C++' workload" -ForegroundColor White
    Write-Host "  4. Install and restart" -ForegroundColor White
    Write-Host ""
}

Read-Host "Press Enter to exit"

