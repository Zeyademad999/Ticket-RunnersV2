# 🔧 Install Physical NFC Reader Support

## The Problem
`nfc-pcsc` requires native C++ compilation, which needs Visual Studio Build Tools on Windows.

## Solution: Install Visual Studio Build Tools

### Step 1: Download Build Tools
1. Go to: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
2. Download "Build Tools for Visual Studio 2022"
3. Run the installer

### Step 2: Install C++ Workload
1. In the installer, select **"Desktop development with C++"** workload
2. Make sure these are checked:
   - ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
   - ✅ Windows 10/11 SDK (latest version)
   - ✅ C++ CMake tools for Windows
3. Click **Install**
4. Wait for installation to complete (may take 10-20 minutes)
5. **Restart your computer** (important!)

### Step 3: Install nfc-pcsc
After restarting, open a **NEW** terminal and run:

```bash
cd nfc-bridge-server
npm install nfc-pcsc
```

### Step 4: Verify Installation
```bash
node -e "require('nfc-pcsc'); console.log('✅ Success!')"
```

If you see "✅ Success!", you're ready!

### Step 5: Start Service with Physical Reader
```bash
start-nfc-service.bat
```

You should now see:
```
✅ NFC Reader connected: ACR122U PICC Interface
```

## Alternative: Use Simple Mode (No Installation Needed)

If you don't want to install Build Tools, you can use Simple Mode:

1. Keep using `start-nfc-service.bat` (it will use Simple Mode)
2. Type card UIDs manually in the console
3. Cards will still be auto-added to your admin dashboard

## Quick Test After Installation

1. Plug in your ACR122U reader
2. Run `start-nfc-service.bat`
3. Place a card on the reader
4. You should see: `🎫 Card Scanned: [UID]`
5. Card appears in admin dashboard automatically!

