# 📋 Step-by-Step: After Downloading Build Tools

## ✅ Step 1: Run the Installer
1. Find the downloaded file (usually `vs_buildtools.exe`)
2. Double-click to run it
3. Click "Yes" if Windows asks for permission

## ✅ Step 2: Select Workload
In the installer window:
1. **Check the box:** "Desktop development with C++"
2. **Make sure these are checked:**
   - ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
   - ✅ Windows 10/11 SDK (latest version)
   - ✅ C++ CMake tools for Windows (optional but helpful)

## ✅ Step 3: Install
1. Click **"Install"** button
2. Wait 10-20 minutes (grab a coffee ☕)
3. When done, click **"Restart"** or restart manually

## ✅ Step 4: After Restart - Install nfc-pcsc
Open PowerShell or Command Prompt and run:

```powershell
cd G:\Ticket-RunnersAll\nfc-bridge-server
npm install nfc-pcsc
```

This will take 1-2 minutes.

## ✅ Step 5: Verify Installation
```powershell
node -e "require('nfc-pcsc'); console.log('✅ Success!')"
```

If you see "✅ Success!", you're ready!

## ✅ Step 6: Start the Service
```powershell
.\start-nfc-service.bat
```

You should see:
```
✅ NFC Reader connected: ACR122U PICC Interface
```

## ✅ Step 7: Test It!
1. Place an NFC card on your reader
2. You should see: `🎫 Card Scanned: [UID]`
3. Check your admin dashboard - card should auto-appear!

---

## 🆘 Troubleshooting

**If `npm install nfc-pcsc` fails:**
- Make sure you restarted after Build Tools installation
- Try: `npm install nfc-pcsc --verbose` to see detailed errors

**If reader not detected:**
- Make sure ACR122U is plugged in via USB
- Check Device Manager for "ACR122U" or "Smart Card Reader"
- Try unplugging and replugging the reader

**Still in Simple Mode?**
- Make sure `nfc-pcsc` installed successfully (Step 5 should show ✅)
- Check the service console for error messages

