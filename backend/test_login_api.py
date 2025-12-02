#!/usr/bin/env python
"""
Test script to simulate the exact API login request.
"""
import os
import sys
import django
import requests
import json

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketrunners.settings')
django.setup()

def test_login_api():
    """Test the login API endpoint directly."""
    url = 'http://localhost:8000/api/merchant/login/'
    data = {
        'mobile': '01104484492',
        'password': 'password'
    }
    
    print(f"[TEST] Testing login API")
    print(f"URL: {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
        print(f"\n[RESPONSE] Status: {response.status_code}")
        print(f"[RESPONSE] Headers: {dict(response.headers)}")
        print(f"[RESPONSE] Data: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\n[SUCCESS] Login successful!")
        else:
            print(f"\n[ERROR] Login failed with status {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] Could not connect to server. Is Django server running?")
    except Exception as e:
        print(f"\n[ERROR] Exception: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_login_api()

