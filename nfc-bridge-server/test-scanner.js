#!/usr/bin/env node
/**
 * NFC Card Scanner Test Tool
 * Connects to the NFC service and displays card scans in real-time
 */

const WebSocket = require("ws");

const WS_URL = process.env.NFC_WS_URL || "ws://localhost:9090";
const HTTP_URL = process.env.NFC_HTTP_URL || "http://localhost:8765";

console.log("=".repeat(60));
console.log("🎫 NFC Card Scanner Test Tool");
console.log("=".repeat(60));
console.log(`Connecting to: ${WS_URL}`);
console.log("");

let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connect() {
  try {
    ws = new WebSocket(WS_URL);

    ws.on("open", () => {
      console.log("✅ Connected to NFC service!");
      console.log("📡 Waiting for card scans...");
      console.log("");
      reconnectAttempts = 0;
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "SCAN") {
          console.log("─".repeat(60));
          console.log("🎫 CARD SCANNED!");
          console.log("─".repeat(60));
          console.log(`   UID:        ${message.uid}`);
          console.log(`   Reader:     ${message.reader || "Unknown"}`);
          console.log(`   Timestamp:  ${new Date(message.timestamp || Date.now()).toLocaleString()}`);
          console.log("─".repeat(60));
          console.log("");
          console.log("✅ Card successfully read and sent to admin dashboard!");
          console.log("");
        } else if (message.type === "CONNECTED") {
          console.log("📡 Service Status:");
          console.log(`   NFC Available: ${message.nfc_available ? "✅ Yes" : "❌ No"}`);
          console.log(`   Reader: ${message.reader_name || "Unknown"}`);
          console.log(`   Status: ${message.status || "connected"}`);
          console.log("");
        } else if (message.type === "PONG") {
          // Heartbeat response
        } else {
          console.log("📨 Message received:", message);
        }
      } catch (error) {
        console.error("❌ Error parsing message:", error);
      }
    });

    ws.on("error", (error) => {
      if (error.code === "ECONNREFUSED") {
        console.log("❌ Connection refused. Is the NFC service running?");
        console.log(`   Make sure to start: npm start or node nfc-service.js`);
      } else {
        console.error("❌ WebSocket error:", error.message);
      }
    });

    ws.on("close", () => {
      console.log("");
      console.log("❌ Connection closed");
      
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * reconnectAttempts, 5000);
        console.log(`🔄 Reconnecting in ${delay / 1000} seconds... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
        setTimeout(connect, delay);
      } else {
        console.log("❌ Max reconnection attempts reached. Exiting.");
        process.exit(1);
      }
    });

  } catch (error) {
    console.error("❌ Connection error:", error.message);
    process.exit(1);
  }
}

// Check HTTP status first
async function checkServiceStatus() {
  try {
    const http = require("http");
    const url = require("url");
    const httpUrl = new URL(HTTP_URL);
    
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: httpUrl.hostname,
        port: httpUrl.port,
        path: "/status",
        method: "GET",
        timeout: 2000
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const status = JSON.parse(data);
            console.log("📊 Service Status:");
            console.log(`   Status: ${status.status}`);
            console.log(`   Mode: ${status.mode || "full"}`);
            console.log(`   Reader: ${status.reader_name || "Unknown"}`);
            console.log(`   Connected Clients: ${status.connected_clients || 0}`);
            console.log("");
            resolve(status);
          } catch (e) {
            resolve(null);
          }
        });
      });
      
      req.on("error", () => {
        console.log("⚠️  Could not check HTTP status (service may still be starting)");
        console.log("");
        resolve(null);
      });
      
      req.on("timeout", () => {
        req.destroy();
        console.log("⚠️  HTTP status check timed out");
        console.log("");
        resolve(null);
      });
      
      req.end();
    });
  } catch (error) {
    return null;
  }
}

// Main
(async () => {
  await checkServiceStatus();
  connect();
  
  // Keep process alive
  process.on("SIGINT", () => {
    console.log("");
    console.log("🛑 Shutting down test tool...");
    if (ws) {
      ws.close();
    }
    process.exit(0);
  });
})();

