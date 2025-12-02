#!/bin/bash

echo "========================================"
echo "Ticket Runners - Complete Startup"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Starting all services..."
echo ""

# Function to start service in background
start_service() {
    local name=$1
    local command=$2
    echo "[$name] Starting..."
    nohup bash -c "$command" > /tmp/${name// /_}.log 2>&1 &
    echo "  PID: $!"
    sleep 2
}

# Start NFC Service
if [ -d "nfc-bridge-server" ]; then
    start_service "NFC Bridge Service" "cd nfc-bridge-server && ./start-nfc-service.sh"
else
    echo "[NFC Bridge Service] Directory not found, skipping..."
fi

# Start Backend
if [ -f "backend/manage.py" ]; then
    start_service "Django Backend" "cd backend && python manage.py runserver"
else
    echo "[Django Backend] Not found, skipping..."
fi

# Start Admin Dashboard
if [ -f "frontend/admin-dashboard/package.json" ]; then
    start_service "Admin Dashboard" "cd frontend/admin-dashboard && npm run dev"
else
    echo "[Admin Dashboard] Not found, skipping..."
fi

echo ""
echo "========================================"
echo "All services are starting..."
echo "========================================"
echo ""
echo "NFC Service: http://localhost:8760"
echo "Admin Dashboard: http://localhost:8081"
echo ""
echo "Check logs in /tmp/ for each service"
echo "To stop services, use: pkill -f 'nfc-service|manage.py|vite'"
echo ""



