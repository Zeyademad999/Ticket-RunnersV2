# ⚠️ IMPORTANT: Add C++ Workload to Build Tools

## The Problem
Build Tools are installed, but the **C++ compiler toolset is missing**. You need to add it.

## Quick Fix (5 minutes)

### Step 1: Open Visual Studio Installer
1. Press `Win + R`
2. Type: `"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe"`
3. Press Enter

**OR** search "Visual Studio Installer" in Start Menu

### Step 2: Modify Build Tools
1. Find **"Visual Studio Build Tools 2022"**
2. Click the **"Modify"** button (not Uninstall!)

### Step 3: Add C++ Workload
1. In the "Workloads" tab, check:
   - ✅ **"Desktop development with C++"**

2. On the right side, make sure these are checked:
   - ✅ **MSVC v143 - VS 2022 C++ x64/x86 build tools** ⚠️ **THIS IS CRITICAL!**
   - ✅ Windows 10/11 SDK (latest version)
   - ✅ C++ CMake tools for Windows

### Step 4: Install
1. Click **"Modify"** button at bottom right
2. Wait 10-20 minutes for installation
3. **Restart your computer**

### Step 5: Install nfc-pcsc
After restart, open PowerShell and run:

```powershell
cd G:\Ticket-RunnersAll\nfc-bridge-server
npm install
```

You should see `nfc-pcsc` compile successfully! ✅

---

## Visual Guide

When you open the installer, you should see something like:

```
┌─────────────────────────────────────────┐
│ Visual Studio Build Tools 2022          │
│                                         │
│ [Modify]  [Launch]  [More]             │
└─────────────────────────────────────────┘
```

Click **Modify**, then check the workload:

```
Workloads:
☐ .NET desktop build tools
☑ Desktop development with C++  ← CHECK THIS!
☐ Game development with C++
...
```

Then verify the components on the right show MSVC v143 is checked.

