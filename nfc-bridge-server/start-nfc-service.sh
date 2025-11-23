#!/bin/bash

echo "========================================"
echo "Starting NFC Bridge Service"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js found: $(node --version)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "ERROR: package.json not found!"
    echo "Please run this script from the nfc-bridge-server directory"
    exit 1
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
    echo ""
fi

echo "Starting NFC Service..."
echo ""

# Try to start with full NFC support first
if [ -d "node_modules/nfc-pcsc" ]; then
    echo "Using full NFC support (nfc-pcsc)..."
    echo "WebSocket Server: ws://localhost:9090"
    echo "HTTP Status Server: http://localhost:8765"
    echo ""
    echo "Press Ctrl+C to stop the service"
    echo "========================================"
    echo ""
    node nfc-service.js
else
    echo "Full NFC support not available (nfc-pcsc not installed)"
    echo "Starting in Simple Mode (Manual Input)..."
    echo ""
    echo "WebSocket Server: ws://localhost:9090"
    echo "HTTP Status Server: http://localhost:8765"
    echo ""
    echo "In Simple Mode, you can:"
    echo "  1. Type card UID in this console and press Enter"
    echo "  2. POST to http://localhost:8765/scan with: {\"uid\": \"CARD123\"}"
    echo ""
    echo "Press Ctrl+C to stop the service"
    echo "========================================"
    echo ""
    node nfc-service-simple.js
fi

