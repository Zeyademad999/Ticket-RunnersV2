# 🔧 Install Build Tools - Quick Guide

## Method 1: Automatic (Easiest)

Run this script:
```bash
install-build-tools.bat
```

It will try to install automatically using `winget` (Windows Package Manager).

## Method 2: Manual Installation

### Step 1: Download
1. Go to: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
2. Download "Build Tools for Visual Studio 2022"
3. Run the installer

### Step 2: Install
1. In the installer, select **"Desktop development with C++"** workload
2. Make sure these are checked:
   - ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
   - ✅ Windows 10/11 SDK (latest version)
   - ✅ C++ CMake tools for Windows
3. Click **Install**
4. Wait 10-20 minutes
5. **RESTART your computer** (very important!)

### Step 3: Install nfc-pcsc
After restart, open a NEW terminal:
```bash
cd nfc-bridge-server
npm install nfc-pcsc
```

### Step 4: Verify
```bash
node -e "require('nfc-pcsc'); console.log('✅ Success!')"
```

### Step 5: Start Service
```bash
start-nfc-service.bat
```

You should see:
```
✅ NFC Reader connected: ACR122U PICC Interface
```

## Quick Test Script

After installation, run:
```bash
check-nfc-install.bat
```

This will verify everything is working!

