#!/bin/bash

echo "Starting NFC Bridge Server..."
echo ""
echo "Choose an option:"
echo "1. Simple mode (no hardware - for testing)"
echo "2. Full mode (with NFC hardware)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    echo ""
    echo "Starting in SIMULATION mode..."
    python3 nfc_server_simple.py
elif [ "$choice" == "2" ]; then
    echo ""
    echo "Starting with NFC hardware..."
    python3 nfc_server.py
else
    echo "Invalid choice. Starting in simple mode..."
    python3 nfc_server_simple.py
fi



