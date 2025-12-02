# NFC Bridge Service - Node.js WebSocket Server

Production-ready NFC card scanning service that works with **any browser** and **any PC/SC compatible NFC reader**.

## Features

✅ Works with ACR122U, PN532, and other PC/SC readers  
✅ Real-time WebSocket communication  
✅ Auto-detects NFC reader  
✅ Duplicate scan prevention  
✅ Multiple client support  
✅ Error handling and reconnection  
✅ HTTP status endpoint  

## Quick Start

### 1. Install Dependencies

```bash
cd nfc-bridge-server
npm install
```

### 2. Connect Your NFC Reader

Plug in your USB NFC reader (ACR122U, PN532, etc.)

### 3. Start the Service

```bash
npm start
```

The service will:
- Start WebSocket server on `ws://localhost:9090`
- Start HTTP status server on `http://localhost:8765`
- Auto-detect your NFC reader
- Broadcast card scans to connected clients

## How It Works

```
NFC Card → NFC Reader → Node.js Service → WebSocket → Admin Panel
```

1. **Scan NFC card** on the reader
2. **Service detects** the card UID
3. **Broadcasts** UID via WebSocket to all connected clients
4. **Admin panel** receives UID and auto-fills the form

## API

### WebSocket Server
- **URL**: `ws://localhost:9090`
- **Messages Sent**:
  - `{ type: "SCAN", uid: "ABC123...", timestamp: 1234567890, reader: "ACR122U" }`
  - `{ type: "CONNECTED", status: "connected", nfc_available: true, ... }`
  - `{ type: "ERROR", error: "error message" }`
- **Messages Received**:
  - `{ type: "PING" }` - Heartbeat (responds with PONG)

### HTTP Status Endpoint
- **URL**: `http://localhost:8765/status`
- **Response**:
```json
{
  "status": "running",
  "nfc_available": true,
  "connected_clients": 1,
  "reader_connected": true,
  "reader_name": "ACR122U"
}
```

## Troubleshooting

### Reader Not Detected

1. **Check USB connection** - Make sure reader is plugged in
2. **Install drivers** - Install PC/SC drivers for your reader
3. **Check permissions** (Linux/Mac):
   ```bash
   sudo usermod -a -G dialout $USER
   # Then logout and login again
   ```

### Port Already in Use

Change ports in `nfc-service.js`:
```javascript
const WS_PORT = 9090;  // Change this
const HTTP_PORT = 8765; // Change this
```

### Windows Issues

- Install **PC/SC drivers** for your NFC reader
- Run as **Administrator** if needed
- Check Device Manager for reader recognition

## Development

```bash
npm run dev  # Auto-restart on file changes (requires nodemon)
```

## Production

Use PM2 or similar process manager:

```bash
npm install -g pm2
pm2 start nfc-service.js --name nfc-service
pm2 save
pm2 startup
```

## Security Note

This service runs on localhost only. For production:
- Add authentication to WebSocket connections
- Use WSS (WebSocket Secure) over HTTPS
- Implement rate limiting
- Add IP whitelisting



