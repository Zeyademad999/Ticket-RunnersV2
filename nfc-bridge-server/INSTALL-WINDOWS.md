# Installing NFC Service on Windows

## Option 1: Simple Mode (Recommended - No Build Tools Needed)

The simple mode works without any native dependencies:

```bash
cd nfc-bridge-server
npm install
npm run start:simple
```

This allows you to:
- Type card UIDs manually in the console
- POST card UIDs via HTTP API
- Test the integration without hardware

## Option 2: Full NFC Support (Requires Build Tools)

To use actual NFC hardware, you need to install Visual Studio Build Tools:

### Step 1: Install Visual Studio Build Tools

1. Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
2. Run the installer
3. Select "Desktop development with C++" workload
4. Install

### Step 2: Install NFC Service

```bash
cd nfc-bridge-server
npm install
```

This will compile the native `nfc-pcsc` module.

### Step 3: Start Service

```bash
npm start
```

## Quick Start (Simple Mode)

```bash
cd nfc-bridge-server
start-nfc-service.bat
```

Then:
1. Type card UID in the console and press Enter
2. Card will be automatically added to admin dashboard

## Testing Without Hardware

Use the simple mode - it works perfectly for testing the integration!



