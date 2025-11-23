# 📋 Visual Studio Installer - Step by Step

## When You Open Visual Studio Installer

### Step 1: Find Build Tools
You'll see a list of installed products. Look for:
```
┌─────────────────────────────────────────────────────┐
│ Visual Studio Build Tools 2022                      │
│                                                     │
│ [Modify]  [Launch]  [More ▼]                       │
└─────────────────────────────────────────────────────┘
```

### Step 2: Click "Modify"
- Click the **"Modify"** button (NOT "Launch" or "Uninstall")
- This opens the installation options window

### Step 3: Select Workload Tab
At the top, you'll see tabs:
```
[Workloads]  [Individual components]  [Language packs]  [Installation locations]
```
- Make sure **"Workloads"** tab is selected (it should be by default)

### Step 4: Check the C++ Workload
Scroll down in the workloads list and find:
```
☐ Desktop development with C++
```
- **Check the box** ☑ to select it

### Step 5: Verify Components (Right Side)
When you check "Desktop development with C++", look at the right side panel. You should see:
```
Installation details:
  ☑ MSVC v143 - VS 2022 C++ x64/x86 build tools (Latest)
  ☑ Windows 10 SDK or Windows 11 SDK
  ☑ C++ CMake tools for Windows
  ☑ C++ core features
  ... (other components)
```

**IMPORTANT:** Make sure **"MSVC v143 - VS 2022 C++ x64/x86 build tools"** is checked! ✅

### Step 6: Click Modify Button
At the bottom right, click:
```
[Modify]  [Cancel]
```
- Click **"Modify"** to start installation

### Step 7: Wait for Installation
- A progress window will appear
- It will show: "Downloading...", "Installing..."
- This takes **10-20 minutes**
- You can minimize and do other things

### Step 8: Restart
When installation completes:
- Click **"Restart"** or restart manually
- **This is required!** The tools won't work until you restart

---

## Visual Guide

```
┌─────────────────────────────────────────────────────────────┐
│ Visual Studio Installer                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Visual Studio Build Tools 2022                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ [Modify]  [Launch]  [More ▼]                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [Other products may be listed here...]                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

After clicking Modify:

```
┌─────────────────────────────────────────────────────────────┐
│ Modify - Visual Studio Build Tools 2022                     │
├─────────────────────────────────────────────────────────────┤
│ [Workloads] [Individual components] [Language packs]        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Workloads:                                                  │
│  ☐ .NET desktop build tools                                 │
│  ☑ Desktop development with C++  ← CHECK THIS!             │
│  ☐ Game development with C++                                │
│  ☐ Linux development with C++                               │
│  ...                                                         │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │ Installation details:                 │                  │
│  │ ☑ MSVC v143 - VS 2022 C++ x64/x86    │                  │
│  │ ☑ Windows 10/11 SDK                   │                  │
│  │ ☑ C++ CMake tools                     │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│                              [Modify]  [Cancel]             │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Checklist

- [ ] Opened Visual Studio Installer
- [ ] Found "Visual Studio Build Tools 2022"
- [ ] Clicked "Modify" button
- [ ] Selected "Workloads" tab
- [ ] Checked ☑ "Desktop development with C++"
- [ ] Verified "MSVC v143" is checked on the right
- [ ] Clicked "Modify" to install
- [ ] Waited 10-20 minutes
- [ ] Restarted computer

---

## After Restart

Once you've restarted, come back and we'll:
1. Install `nfc-pcsc` (it will compile successfully now!)
2. Start the service in Full Mode
3. Test your physical NFC reader

