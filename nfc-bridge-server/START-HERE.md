# 🚀 START HERE - NFC Auto-Add Setup

## ✅ Everything is Ready!

Your NFC reader is working and the code is fully integrated. Here's how to use it:

## 📋 Quick Start (3 Steps)

### Step 1: Start the NFC Service

**Windows:**
```bash
cd nfc-bridge-server
start-nfc-service.bat
```

**Linux/Mac:**
```bash
cd nfc-bridge-server
chmod +x start-nfc-service.sh
./start-nfc-service.sh
```

You should see:
```
🔌 NFC Service - WebSocket Server
WebSocket Server: ws://localhost:9090
HTTP Status Server: http://localhost:8765
✅ NFC Reader connected: ACR122U PICC Interface
```

### Step 2: Start Your Backend

```bash
cd backend
python manage.py runserver
```

### Step 3: Start Admin Dashboard

```bash
cd frontend/admin-dashboard
npm run dev
```

## 🎯 How It Works

1. **Place card on reader** → ACR122U detects it
2. **Service reads UID** → Converts to hex string
3. **Broadcasts via WebSocket** → Admin dashboard receives it
4. **Auto-adds to database** → Card appears in NFC Card Management

## ✨ Features

- ✅ **Automatic card detection** - No button clicks needed
- ✅ **Duplicate prevention** - Won't add same card twice
- ✅ **Real-time updates** - Card appears immediately in table
- ✅ **Status indicator** - Shows "Reader Ready" when connected
- ✅ **Auto-add toggle** - Enable/disable automatic addition

## 🎮 Using the System

1. Open Admin Dashboard → NFC Card Management
2. Make sure "Auto-Add Cards" checkbox is checked (enabled by default)
3. Place a card on the ACR122U reader
4. Card is automatically added! 🎉

## 🔧 Troubleshooting

### Reader Not Detected
- Make sure ACR122U is plugged in via USB
- Check Device Manager (Windows) - should show "ACR122U"
- Restart the NFC service

### Cards Not Auto-Adding
- Check "Auto-Add Cards" is enabled
- Verify WebSocket connection (should show "Reader Ready")
- Check browser console for errors
- Make sure backend is running

### Service Won't Start
- Make sure Node.js is installed: `node --version`
- Install dependencies: `npm install`
- If nfc-pcsc fails, use simple mode: `npm run start:simple`

## 📝 Card UID Format

The service automatically converts card UIDs to uppercase hex format:
- Example: `04A1B2C3D4E580` 
- This is what gets saved as `serial_number` in the database

## 🎉 That's It!

Your system is now fully automated. Just place cards on the reader and they'll be added automatically!


