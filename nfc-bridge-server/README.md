# NFC Bridge Server

A local HTTP/WebSocket server that interfaces with NFC readers and provides a REST API for web browsers to scan NFC cards. This allows NFC scanning to work in **any browser** on **any operating system**.

## 🚀 Quick Start

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

The script will automatically:
- ✅ Check if Node.js is installed
- ✅ Install dependencies
- ✅ Start the service in the best available mode

## 📋 Two Modes Available

### 1. Simple Mode (No Hardware Required) ✅ Recommended for Testing

Works immediately without any build tools or hardware:

```bash
npm run start:simple
```

**Features:**
- Type card UIDs manually in console
- POST card UIDs via HTTP API
- Perfect for testing the integration
- Works on Windows without Visual Studio

### 2. Full Mode (With NFC Hardware)

Requires Visual Studio Build Tools on Windows:

```bash
npm install nfc-pcsc  # Requires build tools
npm start
```

**Features:**
- Automatic card detection from NFC reader
- Real-time scanning
- Supports ACR122U, PN532, and other PC/SC readers

## 🎯 How It Works

```
NFC Card → NFC Reader → Node.js Service → WebSocket → Admin Panel → Auto-Add to Database
```

1. **Card placed on reader** (or typed in console in simple mode)
2. **Service detects** the card UID
3. **Broadcasts** UID via WebSocket to all connected clients
4. **Admin panel** receives UID and automatically adds it to the database

## 📡 API Endpoints

### WebSocket Server
- **URL**: `ws://localhost:9090`
- **Messages Sent**:
  - `{ type: "SCAN", uid: "ABC123...", timestamp: 1234567890 }`
  - `{ type: "CONNECTED", status: "connected", ... }`

### HTTP Status Endpoint
- **URL**: `http://localhost:8765/status`
- **Response**:
```json
{
  "status": "running",
  "nfc_available": true,
  "connected_clients": 1,
  "reader_connected": true
}
```

### Manual Card Input (Simple Mode)
- **POST** `http://localhost:8765/scan`
- **Body**: `{ "uid": "CARD123" }`

## 🔧 Installation

### Prerequisites

1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **NFC Reader** (optional - only for full mode)
   - ACR122U, PN532, or other PC/SC compatible reader
   - Plug in via USB

### Install Dependencies

```bash
cd nfc-bridge-server
npm install
```

This installs:
- `ws` - WebSocket server (required)
- `nfc-pcsc` - NFC reader support (optional, requires build tools)

## 🪟 Windows Installation

### Option 1: Simple Mode (No Build Tools) ✅ Recommended

Just run:
```bash
npm install
npm run start:simple
```

### Option 2: Full NFC Support

1. Install **Visual Studio Build Tools**:
   - Download: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - Select "Desktop development with C++" workload
   - Install

2. Install NFC support:
   ```bash
   npm install nfc-pcsc
   ```

3. Start service:
   ```bash
   npm start
   ```

## 🧪 Testing

### Test Without Hardware (Simple Mode)

1. Start the service:
   ```bash
   npm run start:simple
   ```

2. Type a card UID in the console:
   ```
   NFC-12345-ABCD
   ```

3. The card will be automatically added to the admin dashboard!

### Test With Hardware

1. Plug in your NFC reader
2. Start the service: `npm start`
3. Place a card on the reader
4. Card is automatically detected and added!

## 🔗 Integration with Admin Dashboard

The admin dashboard automatically:
- ✅ Detects when the service is running
- ✅ Connects via WebSocket
- ✅ Shows "Reader Ready" status
- ✅ Auto-adds cards when scanned (if enabled)

## 🐛 Troubleshooting

### Port Already in Use

Change ports in `nfc-service.js` or `nfc-service-simple.js`:
```javascript
const WS_PORT = 9090;  // Change this
const HTTP_PORT = 8765; // Change this
```

### NFC Reader Not Detected (Full Mode)

1. Make sure reader is plugged in via USB
2. Install PC/SC drivers for your reader
3. On Linux: `sudo usermod -a -G dialout $USER` (then logout/login)

### Build Errors on Windows

Use Simple Mode instead - it works without build tools:
```bash
npm run start:simple
```

## 📝 Usage Examples

### Manual Card Input (Simple Mode)

In the console, just type:
```
NFC-001-2025
```

Or via HTTP:
```bash
curl -X POST http://localhost:8765/scan \
  -H "Content-Type: application/json" \
  -d '{"uid": "NFC-001-2025"}'
```

### Check Service Status

```bash
curl http://localhost:8765/status
```

## 🎉 Result

When a card is scanned (or typed):
- ✅ Card UID is detected
- ✅ Broadcast to admin dashboard via WebSocket
- ✅ Automatically added to database
- ✅ Success notification shown
- ✅ Card appears in NFC Card Management table

**Zero manual typing required!** 🚀
