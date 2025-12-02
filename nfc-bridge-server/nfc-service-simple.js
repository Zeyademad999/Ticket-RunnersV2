#!/usr/bin/env node
/**
 * NFC Service - Simple Version (No Native Dependencies)
 * Works without nfc-pcsc - uses HTTP polling or manual input
 * 
 * This version works on Windows without Visual Studio Build Tools
 */

const WebSocket = require("ws");
const http = require("http");
const readline = require("readline");

// Configuration
const WS_PORT = 9090;
const HTTP_PORT = 8765;

// WebSocket Server
const wss = new WebSocket.Server({ port: WS_PORT });
let clients = [];

// HTTP Server for status checks and manual card input
const httpServer = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
      nfc_available: true,
      connected_clients: clients.length,
      reader_connected: true,
      reader_name: 'Manual Input Mode',
      mode: 'simple'
    }));
  } else if (req.url === '/scan' && req.method === 'POST') {
    // Accept manual card input via POST
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.uid) {
          broadcastCardScan(data.uid);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: 'Card scanned' }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing uid' }));
        }
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else if (req.url === '/scan' && req.method === 'GET') {
    // Return instructions for manual input
    res.writeHead(200);
    res.end(JSON.stringify({
      success: false,
      error: 'Use POST /scan with {"uid": "CARD123"} or type card UID in console'
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP status server running on http://localhost:${HTTP_PORT}`);
});

// Broadcast card scan to all clients
function broadcastCardScan(uid) {
  const uidFormatted = uid.toUpperCase().trim();
  
  console.log(`📇 Card scanned: ${uidFormatted}`);
  
  const message = JSON.stringify({
    type: "SCAN",
    uid: uidFormatted,
    timestamp: Date.now(),
    reader: "Manual Input"
  });
  
  console.log(`   → Broadcasting to ${clients.length} connected client(s)...`);
  
  let sentCount = 0;
  clients.forEach((client, index) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        sentCount++;
        console.log(`   ✅ Sent to client ${index + 1}`);
      } catch (error) {
        console.error(`   ❌ Error sending to client ${index + 1}:`, error.message);
      }
    } else {
      console.log(`   ⚠️  Client ${index + 1} not ready (state: ${client.readyState})`);
    }
  });
  
  console.log(`   → Successfully sent to ${sentCount}/${clients.length} client(s)`);
  
  if (clients.length === 0) {
    console.log(`   ⚠️  WARNING: No clients connected! Make sure admin dashboard is open.`);
  }
}

console.log("=".repeat(60));
console.log("NFC Service - Simple Mode (Manual Input)");
console.log("=".repeat(60));
console.log(`WebSocket Server: ws://localhost:${WS_PORT}`);
console.log(`HTTP Status Server: http://localhost:${HTTP_PORT}`);
console.log("");
console.log("Mode: Manual Input");
console.log("You can:");
console.log("  1. Type card UID in this console and press Enter");
console.log("  2. POST to http://localhost:8765/scan with: {\"uid\": \"CARD123\"}");
console.log("");
console.log("Press Ctrl+C to stop");
console.log("=".repeat(60));
console.log("");

// Set up console input for manual card entry
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  const uid = input.trim();
  if (uid) {
    broadcastCardScan(uid);
  }
});

// WebSocket connection handling
wss.on("connection", (ws, req) => {
  const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
  clients.push(ws);
  
  console.log(`\n✅ Client connected: ${clientId} (${clients.length} total)`);
  
  // Send current status
  ws.send(JSON.stringify({
    type: "CONNECTED",
    status: "connected",
    nfc_available: true,
    reader_connected: true,
    reader_name: "Manual Input Mode",
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
  
  rl.close();
  
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



