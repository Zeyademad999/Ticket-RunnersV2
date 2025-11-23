"""
Test script to verify SMS sending functionality.
Run with: python manage.py shell < core/test_sms.py
Or: python manage.py shell, then copy-paste the code below
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketrunners.settings')
django.setup()

import requests
from django.conf import settings

# Test phone number
test_phone = "01104484492"
test_message = "Test message from TicketRunners - SMS notification system is working!"

# Get token from settings
FLOKI_SMS_TOKEN = getattr(settings, 'FLOKI_SMS_TOKEN', 'floki-secure-token-9f8e4c1f79284d99bdad6c74ea7ac2f1')

# SMS endpoint
sms_url = "https://flokisystems.com/flokisms/send-msg.php"

headers = {
    "Authorization": f"Bearer {FLOKI_SMS_TOKEN}",
    "Content-Type": "application/x-www-form-urlencoded",
}

data = {
    "text_message": test_message,
    "phone": test_phone,
}

print(f"Sending test SMS to {test_phone}...")
print(f"Message: {test_message}")
print(f"URL: {sms_url}")
print(f"Token: {FLOKI_SMS_TOKEN[:20]}...")

try:
    response = requests.post(sms_url, headers=headers, data=data, timeout=10)
    print(f"\nResponse Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    
    try:
        result = response.json()
        print(f"Response JSON: {result}")
    except ValueError:
        print(f"Response Text: {response.text}")
    
    if response.status_code == 200:
        print("\n✓ SMS sent successfully!")
    else:
        print(f"\n✗ SMS failed with status code: {response.status_code}")
        
except Exception as e:
    print(f"\n✗ Error sending SMS: {str(e)}")
    import traceback
    traceback.print_exc()


