#!/usr/bin/env node
/**
 * NFC Service - Node.js WebSocket Server
 * Connects to NFC reader and broadcasts card scans to connected clients
 * 
 * Supports: ACR122U, PN532, and other PC/SC compatible readers
 */

const WebSocket = require("ws");
const http = require("http");

// Try to load NFC library
let NFC;
try {
  const nfcPcsc = require("nfc-pcsc");
  NFC = nfcPcsc.NFC; // nfc-pcsc exports NFC as a property
} catch (error) {
  console.error("⚠️  nfc-pcsc not available. Please use nfc-service-simple.js instead.");
  console.error("   Or install Visual Studio Build Tools and run: npm install nfc-pcsc");
  process.exit(1);
}

// Configuration
const WS_PORT = 9090;
const HTTP_PORT = 8765;

// WebSocket Server
const wss = new WebSocket.Server({ port: WS_PORT });
let clients = [];

// HTTP Server for status checks
const httpServer = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/status') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'running',
      nfc_available: nfcInitialized,
      connected_clients: clients.length,
      reader_connected: readerConnected,
      reader_name: readerName || null
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP status server running on http://localhost:${HTTP_PORT}`);
});

// NFC State
let nfcInitialized = false;
let readerConnected = false;
let readerName = null;
let lastScannedUID = null;
let lastScanTime = null;

console.log("=".repeat(60));
console.log("🔌 NFC Service - WebSocket Server");
console.log("=".repeat(60));
console.log(`WebSocket Server: ws://localhost:${WS_PORT}`);
console.log(`HTTP Status Server: http://localhost:${HTTP_PORT}`);
console.log("Waiting for NFC reader...");
console.log("=".repeat(60));
console.log("");

// Initialize NFC
const nfc = new NFC();

nfc.on("reader", (reader) => {
  readerConnected = true;
  readerName = reader.reader.name;
  nfcInitialized = true;
  
  console.log(`\n✅ NFC Reader connected: ${readerName}`);
  console.log(`📡 Broadcasting to ${clients.length} connected client(s)\n`);

  reader.on("card", async (card) => {
    try {
      const uid = card.uid;
      // Convert UID to hex string (ACR122U returns Buffer/array)
      let uidFormatted;
      
      if (Buffer.isBuffer(uid)) {
        // Most common format from ACR122U
        uidFormatted = uid.toString('hex').toUpperCase();
      } else if (Array.isArray(uid)) {
        // Array format
        uidFormatted = uid.map(b => {
          const byte = typeof b === 'number' ? b : parseInt(b, 16);
          return byte.toString(16).padStart(2, '0');
        }).join('').toUpperCase();
      } else if (typeof uid === 'string') {
        // Already a string
        uidFormatted = uid.toUpperCase().trim().replace(/[^0-9A-F]/gi, '');
      } else if (uid && typeof uid === 'object' && uid.length !== undefined) {
        // Uint8Array or similar
        uidFormatted = Array.from(new Uint8Array(uid))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase();
      } else {
        // Fallback: try to convert to string
        uidFormatted = String(uid).toUpperCase().trim().replace(/[^0-9A-F]/gi, '');
      }
      
      // Validate UID format (should be hex)
      if (!uidFormatted || !/^[0-9A-F]+$/.test(uidFormatted)) {
        console.error(`❌ Invalid UID format: ${uid}`);
        return;
      }
      
      // Avoid duplicate scans (same card within 2 seconds)
      if (lastScannedUID === uidFormatted) {
        const timeSinceLastScan = Date.now() - (lastScanTime || 0);
        if (timeSinceLastScan < 2000) {
          return; // Ignore duplicate scan
        }
      }
      
      lastScannedUID = uidFormatted;
      lastScanTime = Date.now();
      
      console.log(`🎫 Card Scanned: ${uidFormatted}`);
      
      // Broadcast to all connected clients
      const message = JSON.stringify({
        type: "SCAN",
        uid: uidFormatted,
        timestamp: Date.now(),
        reader: readerName
      });
      
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
      
      console.log(`   → Sent to ${clients.length} client(s)`);
      
    } catch (error) {
      console.error("❌ Error processing card scan:", error);
      
      // Send error to clients
      const errorMessage = JSON.stringify({
        type: "ERROR",
        error: error.message,
        timestamp: Date.now()
      });
      
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(errorMessage);
        }
      });
    }
  });

  reader.on("card.off", (card) => {
    try {
      const uid = card?.uid;
      let uidFormatted = lastScannedUID || "Unknown";
      
      // Try to get UID from card object if available
      if (uid) {
        // Format UID the same way as card scan
        if (Buffer.isBuffer(uid)) {
          uidFormatted = uid.toString('hex').toUpperCase();
        } else if (Array.isArray(uid)) {
          uidFormatted = uid.map(b => {
            const byte = typeof b === 'number' ? b : parseInt(b, 16);
            return byte.toString(16).padStart(2, '0');
          }).join('').toUpperCase();
        } else if (typeof uid === 'string') {
          uidFormatted = uid.toUpperCase().trim().replace(/[^0-9A-F]/gi, '');
        } else if (uid && typeof uid === 'object' && uid.length !== undefined) {
          uidFormatted = Array.from(new Uint8Array(uid))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
        } else {
          uidFormatted = String(uid).toUpperCase().trim().replace(/[^0-9A-F]/gi, '');
        }
      }
      
      console.log(`📇 Card removed: ${uidFormatted}`);
    } catch (error) {
      console.log(`📇 Card removed: ${lastScannedUID || "Unknown"}`);
    }
  });

  reader.on("error", (err) => {
    console.error(`❌ Reader error:`, err);
    readerConnected = false;
    
    // Notify clients
    const errorMessage = JSON.stringify({
      type: "READER_ERROR",
      error: err.message,
      timestamp: Date.now()
    });
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(errorMessage);
      }
    });
  });

  reader.on("end", () => {
    console.log(`\n⚠️  Reader disconnected: ${readerName}`);
    readerConnected = false;
    readerName = null;
  });
});

nfc.on("error", (err) => {
  console.error("❌ NFC Error:", err);
  nfcInitialized = false;
  readerConnected = false;
});

// WebSocket connection handling
wss.on("connection", (ws, req) => {
  const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
  clients.push(ws);
  
  console.log(`\n🖥️  Admin Panel connected: ${clientId} (${clients.length} total)`);
  
  // Send current status
  ws.send(JSON.stringify({
    type: "CONNECTED",
    status: "connected",
    nfc_available: nfcInitialized,
    reader_connected: readerConnected,
    reader_name: readerName,
    timestamp: Date.now()
  }));

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === "PING") {
        ws.send(JSON.stringify({
          type: "PONG",
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    clients = clients.filter((client) => client !== ws);
    console.log(`\n❌ Client disconnected: ${clientId} (${clients.length} remaining)`);
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error for ${clientId}:`, error);
    clients = clients.filter((client) => client !== ws);
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 Shutting down NFC service...");
  
  // Close all WebSocket connections
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
  
  wss.close(() => {
    console.log("✅ WebSocket server closed");
  });
  
  httpServer.close(() => {
    console.log("✅ HTTP server closed");
  });
  
  process.exit(0);
});

// Keep process alive
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
});

