# 🎫 NFC Card Scanner Test Tool

A simple console application to test if cards are being scanned and read correctly.

## Quick Start

### Step 1: Start the NFC Service
In one terminal:
```bash
cd nfc-bridge-server
npm start
# or
start-nfc-service.bat
```

### Step 2: Run the Test Tool
In another terminal:
```bash
cd nfc-bridge-server
npm test
# or
node test-scanner.js
# or (Windows)
test-scanner.bat
```

## What It Does

The test tool:
- ✅ Connects to the NFC service WebSocket
- ✅ Displays service status
- ✅ Shows card scans in real-time with:
  - Card UID
  - Reader name
  - Timestamp
- ✅ Confirms cards are sent to admin dashboard

## Example Output

```
============================================================
🎫 NFC Card Scanner Test Tool
============================================================
Connecting to: ws://localhost:9090

📊 Service Status:
   Status: running
   Mode: simple
   Reader: Manual Input Mode
   Connected Clients: 1

✅ Connected to NFC service!
📡 Waiting for card scans...

────────────────────────────────────────────────────────────
🎫 CARD SCANNED!
────────────────────────────────────────────────────────────
   UID:        04A1B2C3D4E580
   Reader:     Manual Input Mode
   Timestamp:  1/15/2024, 2:30:45 PM
────────────────────────────────────────────────────────────

✅ Card successfully read and sent to admin dashboard!
```

## Testing

### With Physical Reader (nfc-pcsc installed)
1. Start NFC service: `npm start`
2. Start test tool: `npm test`
3. Place card on reader → See scan in test tool

### With Simple Mode (no reader)
1. Start NFC service: `npm run start:simple`
2. Start test tool: `npm test`
3. In NFC service console, type a card UID and press Enter
4. See scan appear in test tool

## Troubleshooting

**"Connection refused"**
- Make sure NFC service is running first
- Check if service is on port 9090

**No scans appearing**
- Verify service is running
- Check if reader is connected (for full mode)
- Try typing a UID in simple mode console

