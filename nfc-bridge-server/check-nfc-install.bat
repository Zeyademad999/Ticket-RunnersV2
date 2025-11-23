@echo off
echo ========================================
echo Checking NFC Reader Installation
echo ========================================
echo.

echo [1/3] Checking if nfc-pcsc is installed...
node -e "try { require('nfc-pcsc'); console.log('✅ nfc-pcsc is installed!'); } catch(e) { console.log('❌ nfc-pcsc NOT installed'); console.log('   Error:', e.message); console.log(''); console.log('   You need to install Visual Studio Build Tools first.'); console.log('   See: INSTALL-PHYSICAL-READER.md'); }"
echo.

echo [2/3] Checking if NFC reader is connected...
powershell -Command "Get-PnpDevice | Where-Object {$_.FriendlyName -like '*ACR*' -or $_.FriendlyName -like '*NFC*' -or $_.FriendlyName -like '*PC/SC*'} | Select-Object FriendlyName, Status | Format-Table"
echo.

echo [3/3] Testing service...
echo.
echo If nfc-pcsc is installed, run: start-nfc-service.bat
echo If not, you'll need to install Visual Studio Build Tools first.
echo.
pause

