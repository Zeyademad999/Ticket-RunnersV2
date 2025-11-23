#!/usr/bin/env python
"""
Script to verify and debug merchant login credentials.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketrunners.settings')
django.setup()

from users.models import Merchant

def verify_merchant():
    """Verify merchant credentials."""
    mobile_number = '01104484492'
    password = 'password'
    
    print(f"[DEBUG] Looking for merchant with mobile: {mobile_number}")
    
    try:
        merchant = Merchant.objects.get(mobile_number=mobile_number)
        print(f"[SUCCESS] Merchant found!")
        print(f"   ID: {merchant.id}")
        print(f"   Business Name: {merchant.business_name}")
        print(f"   Mobile Number: {merchant.mobile_number}")
        print(f"   Status: {merchant.status}")
        print(f"   Has Password: {'Yes' if merchant.password else 'No'}")
        print(f"   Password Hash: {merchant.password[:50] if merchant.password else 'None'}...")
        
        # Test password
        if merchant.password:
            password_check = merchant.check_password(password)
            print(f"\n[TEST] Password check result: {password_check}")
            
            if not password_check:
                print("[WARNING] Password check failed! Resetting password...")
                merchant.set_password(password)
                merchant.save()
                print("[SUCCESS] Password reset. Testing again...")
                password_check = merchant.check_password(password)
                print(f"[TEST] Password check after reset: {password_check}")
        else:
            print("[WARNING] No password set! Setting password...")
            merchant.set_password(password)
            merchant.status = 'active'
            merchant.save()
            print("[SUCCESS] Password set. Testing...")
            password_check = merchant.check_password(password)
            print(f"[TEST] Password check: {password_check}")
        
        # Verify status
        if merchant.status != 'active':
            print(f"[WARNING] Status is '{merchant.status}', setting to 'active'...")
            merchant.status = 'active'
            merchant.save()
            print("[SUCCESS] Status updated to 'active'")
        
        print(f"\n[FINAL] Merchant is ready for login:")
        print(f"   Mobile: {merchant.mobile_number}")
        print(f"   Password: {password}")
        print(f"   Status: {merchant.status}")
        print(f"   Password Valid: {merchant.check_password(password)}")
        
    except Merchant.DoesNotExist:
        print(f"[ERROR] Merchant with mobile '{mobile_number}' not found!")
        print("[INFO] Creating new merchant...")
        
        merchant = Merchant.objects.create(
            business_name='Tech Solutions Store',
            owner_name='Ahmed Al Mansouri',
            email='techsolutions@example.com',
            phone='01104484492',
            mobile_number=mobile_number,
            location='Downtown, City',
            address='123 Main Street, Downtown, City',
            gmaps_location='https://maps.google.com/?q=123+Main+Street',
            contact_name='Ahmed Al Mansouri',
            business_type='Retail',
            status='active',
            verification_status='verified',
        )
        
        merchant.set_password(password)
        merchant.save()
        
        print("[SUCCESS] Merchant created!")
        print(f"   Mobile: {merchant.mobile_number}")
        print(f"   Password: {password}")
        print(f"   Status: {merchant.status}")
        print(f"   Password Valid: {merchant.check_password(password)}")
        
    except Exception as e:
        print(f"[ERROR] Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    verify_merchant()

