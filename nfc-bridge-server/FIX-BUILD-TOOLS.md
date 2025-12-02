# 🔧 Fix: Build Tools Missing C++ Toolset

## Problem
Build Tools are installed but the C++ compiler toolset is missing. The error shows:
```
- found "Visual Studio C++ core features"
- missing any VC++ toolset
```

## Solution: Reinstall Build Tools with C++ Workload

### Option 1: Use Visual Studio Installer (Recommended)

1. **Open Visual Studio Installer:**
   - Press `Win + R`
   - Type: `"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe"`
   - Or search "Visual Studio Installer" in Start Menu

2. **Modify Build Tools:**
   - Find "Visual Studio Build Tools 2022"
   - Click **"Modify"** button

3. **Select C++ Workload:**
   - Check **"Desktop development with C++"**
   - Make sure these are checked:
     - ✅ **MSVC v143 - VS 2022 C++ x64/x86 build tools** (THIS IS CRITICAL!)
     - ✅ Windows 10/11 SDK (latest version)
     - ✅ C++ CMake tools for Windows

4. **Click "Modify"** and wait for installation (10-20 minutes)

5. **Restart your computer**

### Option 2: Reinstall from Scratch

1. **Uninstall Build Tools:**
   - Settings → Apps → "Visual Studio Build Tools 2022" → Uninstall

2. **Download fresh installer:**
   - https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022

3. **Run installer and select:**
   - ✅ **Desktop development with C++** workload
   - Make sure **MSVC v143** is checked!

4. **Install and restart**

## After Fixing

Once the C++ toolset is installed, run:

```powershell
cd nfc-bridge-server
npm install
```

You should see `nfc-pcsc` compile successfully!

