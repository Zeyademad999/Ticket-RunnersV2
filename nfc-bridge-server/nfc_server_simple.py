#!/usr/bin/env python3
"""
Simple NFC Bridge Server (No Hardware Required)
A simplified version that simulates NFC scanning for testing.
Use this if you don't have NFC hardware or want to test the integration.
"""

import http.server
import socketserver
import json
import time
from urllib.parse import urlparse

PORT = 8765
SCAN_TIMEOUT = 30

# Simulated scan result (for testing)
SIMULATED_SERIAL = "NFC-TEST-12345"

class SimpleNFCRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Simple HTTP request handler that simulates NFC scanning"""
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if path == '/status':
            response = {
                'status': 'running',
                'nfc_available': True,
                'nfc_message': 'Simulated NFC reader (no hardware required)',
                'is_scanning': False,
                'mode': 'simulation'
            }
            self.wfile.write(json.dumps(response).encode())
        
        elif path == '/scan':
            # Simulate scanning delay
            time.sleep(2)  # Simulate 2 second scan time
            
            # Return simulated result
            response = {
                'success': True,
                'serialNumber': SIMULATED_SERIAL,
                'timestamp': time.time(),
                'note': 'This is a simulated scan result'
            }
            self.wfile.write(json.dumps(response).encode())
        
        elif path == '/poll':
            # Simulate polling
            time.sleep(2)
            response = {
                'success': True,
                'serialNumber': SIMULATED_SERIAL,
                'timestamp': time.time(),
                'note': 'This is a simulated scan result'
            }
            self.wfile.write(json.dumps(response).encode())
        
        else:
            response = {
                'error': 'Unknown endpoint',
                'available_endpoints': ['/status', '/scan', '/poll']
            }
            self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if path == '/scan':
            # Simulate starting a scan
            response = {
                'success': True,
                'message': 'Scan started (simulated). Use /poll to get results.'
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            response = {'error': 'Unknown endpoint'}
            self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        """Override to reduce log noise"""
        pass

def main():
    """Start the simple NFC bridge server"""
    print("=" * 60)
    print("Simple NFC Bridge Server (Simulation Mode)")
    print("=" * 60)
    print(f"Starting server on port {PORT}...")
    print("Mode: SIMULATION (no NFC hardware required)")
    print()
    print("Endpoints:")
    print(f"  GET  http://localhost:{PORT}/status - Check server status")
    print(f"  GET  http://localhost:{PORT}/scan   - Simulate NFC scan")
    print(f"  GET  http://localhost:{PORT}/poll   - Poll for results")
    print()
    print("This server returns simulated NFC card data for testing.")
    print("To use real NFC hardware, use nfc_server.py instead.")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    try:
        with socketserver.TCPServer(("", PORT), SimpleNFCRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
    except OSError as e:
        if e.errno == 98:
            print(f"\nError: Port {PORT} is already in use.")
        else:
            print(f"\nError: {e}")

if __name__ == "__main__":
    main()



