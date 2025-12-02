#!/usr/bin/env python
"""
Script to create a test merchant for TicketRunners Merchant Portal.
Run this script from the backend directory:
    python create_test_merchant.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketrunners.settings')
django.setup()

from users.models import Merchant

def create_test_merchant():
    """Create a test merchant with portal credentials."""
    mobile_number = '01104484492'
    password = 'password'
    business_name = 'Tech Solutions Store'
    owner_name = 'Ahmed Al Mansouri'
    email = 'techsolutions@example.com'
    phone = '01104484492'
    
    # Check if merchant already exists
    merchant = Merchant.objects.filter(mobile_number=mobile_number).first()
    
    if merchant:
        print(f"[INFO] Merchant with mobile '{mobile_number}' already exists!")
        print(f"   Business: {merchant.business_name}")
        print(f"   Status: {merchant.status}")
        print(f"   Has Password: {'Yes' if merchant.password else 'No'}")
        
        # Automatically reset password and ensure status is active
        merchant.set_password(password)
        merchant.status = 'active'
        merchant.save()
        print(f"[SUCCESS] Password reset successfully!")
        print(f"\n[CREDENTIALS] Updated Credentials:")
        print(f"   Mobile: {mobile_number}")
        print(f"   Password: {password}")
        return
    
    # Create new merchant
    try:
        merchant = Merchant.objects.create(
            business_name=business_name,
            owner_name=owner_name,
            email=email,
            phone=phone,
            mobile_number=mobile_number,
            location='Downtown, City',
            address='123 Main Street, Downtown, City',
            gmaps_location='https://maps.google.com/?q=123+Main+Street',
            contact_name=owner_name,
            business_type='Retail',
            status='active',
            verification_status='verified',
        )
        
        # Set password
        merchant.set_password(password)
        merchant.save()
        
        print("[SUCCESS] Test merchant created successfully!")
        print(f"\n[CREDENTIALS] Merchant Credentials:")
        print(f"   Mobile Number: {mobile_number}")
        print(f"   Password: {password}")
        print(f"   Business Name: {business_name}")
        print(f"   Owner: {owner_name}")
        print(f"   Status: {merchant.status}")
        print(f"\n[INFO] You can now login to the merchant portal with these credentials.")
        
    except Exception as e:
        print(f"[ERROR] Error creating merchant: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    create_test_merchant()

