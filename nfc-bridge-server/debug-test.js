#!/usr/bin/env node
/**
 * Debug test - Check if WebSocket is working
 */

const WebSocket = require("ws");

console.log("Testing WebSocket connection...");
console.log("Connecting to: ws://localhost:9090");
console.log("");

const ws = new WebSocket("ws://localhost:9090");

ws.on("open", () => {
  console.log("✅ Connected!");
  console.log("Waiting for messages...");
  console.log("");
});

ws.on("message", (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log("📨 Message received:");
    console.log(JSON.stringify(message, null, 2));
    console.log("");
    
    if (message.type === "SCAN") {
      console.log("🎫 CARD SCAN DETECTED!");
      console.log(`   UID: ${message.uid}`);
      console.log("");
    }
  } catch (err) {
    console.log("Raw message:", data.toString());
  }
});

ws.on("error", (error) => {
  console.error("❌ Error:", error.message);
  console.log("");
  console.log("Make sure the NFC service is running!");
  console.log("Run: npm start or start-nfc-service.bat");
});

ws.on("close", () => {
  console.log("❌ Connection closed");
});

// Keep alive
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "PING" }));
  }
}, 30000);

console.log("Press Ctrl+C to exit");
console.log("");

