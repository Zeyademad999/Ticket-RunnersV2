# Quick Start Guide - NFC Service

## 🚀 Fastest Way to Start

### Windows:
```bash
cd nfc-bridge-server
start-nfc-service.bat
```

### Linux/Mac:
```bash
cd nfc-bridge-server
chmod +x start-nfc-service.sh
./start-nfc-service.sh
```

## 📋 Prerequisites

1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **NFC Reader** (optional for testing)
   - ACR122U, PN532, or other PC/SC compatible reader
   - Plug in via USB

## ✅ What the Script Does

1. ✅ Checks if Node.js is installed
2. ✅ Installs dependencies automatically (`npm install`)
3. ✅ Starts the NFC service
4. ✅ Shows connection status

## 🔧 Manual Start

If you prefer to start manually:

```bash
cd nfc-bridge-server
npm install
npm start
```

## 🌐 Service Endpoints

Once running, the service provides:

- **WebSocket**: `ws://localhost:9090` - Real-time card scanning
- **HTTP Status**: `http://localhost:8765/status` - Service status check

## 🧪 Test Without Hardware

If you don't have an NFC reader, you can test with the simple Python server:

```bash
cd nfc-bridge-server
python nfc_server_simple.py
```

## 🐛 Troubleshooting

### Port Already in Use
If port 9090 or 8765 is in use:
- Change ports in `nfc-service.js` (lines 14-15)
- Or stop the service using that port

### NFC Reader Not Detected
1. Make sure reader is plugged in via USB
2. Install PC/SC drivers for your reader
3. On Linux: `sudo usermod -a -G dialout $USER` (then logout/login)

### Dependencies Won't Install
```bash
npm cache clean --force
npm install
```

## 📱 Integration

The admin dashboard will automatically connect when:
1. NFC service is running
2. You're on the NFC Card Management page
3. Auto-add is enabled (checkbox)

Cards will be automatically added when placed on the reader!



