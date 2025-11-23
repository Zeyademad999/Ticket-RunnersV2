#!/usr/bin/env python3
"""
NFC Bridge Server
A local HTTP server that interfaces with NFC readers and provides a REST API
for web browsers to scan NFC cards.

This works with any browser by running a local server that communicates with
the NFC reader hardware.
"""

import http.server
import socketserver
import json
import threading
import time
from urllib.parse import urlparse, parse_qs
import sys

# Try to import NFC libraries
try:
    import nfcpy
    NFC_LIBRARY = 'nfcpy'
except ImportError:
    try:
        import nfc
        NFC_LIBRARY = 'nfc'
    except ImportError:
        NFC_LIBRARY = None

# Configuration
PORT = 8765
SCAN_TIMEOUT = 30  # seconds

class NFCReader:
    """Wrapper for NFC reader functionality"""
    
    def __init__(self):
        self.reader = None
        self.is_scanning = False
        self.last_scan_result = None
        
    def initialize(self):
        """Initialize the NFC reader"""
        if NFC_LIBRARY is None:
            return False, "No NFC library found. Please install nfcpy or python-nfc"
        
        try:
            if NFC_LIBRARY == 'nfcpy':
                # Initialize nfcpy
                self.reader = nfcpy.ContactlessFrontend('usb')
                return True, "NFC reader initialized successfully"
            elif NFC_LIBRARY == 'nfc':
                # Initialize libnfc
                self.reader = nfc.ContactlessFrontend('usb')
                return True, "NFC reader initialized successfully"
        except Exception as e:
            return False, f"Failed to initialize NFC reader: {str(e)}"
    
    def scan_card(self, timeout=30):
        """Scan for an NFC card and return the serial number"""
        if not self.reader:
            return None, "NFC reader not initialized"
        
        if self.is_scanning:
            return None, "Scan already in progress"
        
        self.is_scanning = True
        try:
            if NFC_LIBRARY == 'nfcpy':
                # Use nfcpy to scan
                tag = self.reader.connect(rdwr={'on-connect': lambda tag: False})
                if tag:
                    # Extract serial number from tag
                    serial = tag.identifier.hex().upper()
                    self.last_scan_result = serial
                    return serial, None
            elif NFC_LIBRARY == 'nfc':
                # Use libnfc to scan
                tag = self.reader.connect(rdwr={'on-connect': lambda tag: False})
                if tag:
                    serial = tag.identifier.hex().upper()
                    self.last_scan_result = serial
                    return serial, None
            
            return None, "No card detected"
        except Exception as e:
            return None, f"Scan error: {str(e)}"
        finally:
            self.is_scanning = False

# Global NFC reader instance
nfc_reader = NFCReader()

class NFCRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler for NFC operations"""
    
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
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if path == '/status':
            # Check server and NFC reader status
            initialized, message = nfc_reader.initialize()
            response = {
                'status': 'running',
                'nfc_available': initialized,
                'nfc_message': message,
                'is_scanning': nfc_reader.is_scanning
            }
            self.wfile.write(json.dumps(response).encode())
        
        elif path == '/scan':
            # Start scanning for NFC card
            if nfc_reader.is_scanning:
                response = {
                    'success': False,
                    'error': 'Scan already in progress'
                }
            else:
                # Run scan in a separate thread to avoid blocking
                def scan_thread():
                    serial, error = nfc_reader.scan_card(timeout=SCAN_TIMEOUT)
                    if serial:
                        nfc_reader.last_scan_result = {
                            'success': True,
                            'serialNumber': serial,
                            'timestamp': time.time()
                        }
                    else:
                        nfc_reader.last_scan_result = {
                            'success': False,
                            'error': error or 'No card detected'
                        }
                
                thread = threading.Thread(target=scan_thread)
                thread.daemon = True
                thread.start()
                
                # Wait for scan result (with timeout)
                start_time = time.time()
                while time.time() - start_time < SCAN_TIMEOUT:
                    if nfc_reader.last_scan_result:
                        result = nfc_reader.last_scan_result
                        nfc_reader.last_scan_result = None
                        self.wfile.write(json.dumps(result).encode())
                        return
                    time.sleep(0.1)
                
                # Timeout
                response = {
                    'success': False,
                    'error': 'Scan timeout - no card detected'
                }
                self.wfile.write(json.dumps(response).encode())
        
        elif path == '/poll':
            # Poll for scan result (for long polling)
            start_time = time.time()
            while time.time() - start_time < SCAN_TIMEOUT:
                if nfc_reader.last_scan_result:
                    result = nfc_reader.last_scan_result
                    nfc_reader.last_scan_result = None
                    self.wfile.write(json.dumps(result).encode())
                    return
                time.sleep(0.5)
            
            # Timeout
            response = {
                'success': False,
                'error': 'Poll timeout'
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
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        if path == '/scan':
            # Start scanning
            if nfc_reader.is_scanning:
                response = {
                    'success': False,
                    'error': 'Scan already in progress'
                }
            else:
                # Initialize if needed
                if not nfc_reader.reader:
                    initialized, message = nfc_reader.initialize()
                    if not initialized:
                        response = {
                            'success': False,
                            'error': message
                        }
                        self.wfile.write(json.dumps(response).encode())
                        return
                
                # Start scan in background
                def scan_thread():
                    serial, error = nfc_reader.scan_card(timeout=SCAN_TIMEOUT)
                    if serial:
                        nfc_reader.last_scan_result = {
                            'success': True,
                            'serialNumber': serial,
                            'timestamp': time.time()
                        }
                    else:
                        nfc_reader.last_scan_result = {
                            'success': False,
                            'error': error or 'No card detected'
                        }
                
                thread = threading.Thread(target=scan_thread)
                thread.daemon = True
                thread.start()
                
                response = {
                    'success': True,
                    'message': 'Scan started. Poll /poll endpoint for results.'
                }
            
            self.wfile.write(json.dumps(response).encode())
        
        else:
            response = {
                'error': 'Unknown endpoint'
            }
            self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        """Override to reduce log noise"""
        pass

def main():
    """Start the NFC bridge server"""
    print("=" * 60)
    print("NFC Bridge Server")
    print("=" * 60)
    print(f"Starting server on port {PORT}...")
    print(f"NFC Library: {NFC_LIBRARY or 'None (install nfcpy or python-nfc)'}")
    print()
    print("Endpoints:")
    print(f"  GET  http://localhost:{PORT}/status - Check server status")
    print(f"  GET  http://localhost:{PORT}/scan   - Scan for NFC card (blocking)")
    print(f"  GET  http://localhost:{PORT}/poll   - Poll for scan results")
    print(f"  POST http://localhost:{PORT}/scan   - Start scan (non-blocking)")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    
    try:
        with socketserver.TCPServer(("", PORT), NFCRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        sys.exit(0)
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"\nError: Port {PORT} is already in use.")
            print("Please stop any other service using this port or change PORT in the script.")
        else:
            print(f"\nError: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()



