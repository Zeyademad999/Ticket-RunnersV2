#!/usr/bin/env python
"""
Script to create a test organizer for TicketRunners Organizer Portal.
Run this script from the backend directory:
    python create_test_organizer.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketrunners.settings')
django.setup()

from users.models import Organizer


def create_test_organizer():
    """Create a test organizer with portal credentials."""
    contact_mobile = '01104484492'
    password = 'password'
    name = 'Event Masters Organizer'
    email = 'events@organizer.com'
    phone = '01104484492'
    category = 'Entertainment'
    location = 'Cairo, Egypt'
    
    # Check if organizer already exists
    organizer = Organizer.objects.filter(contact_mobile=contact_mobile).first()
    
    if organizer:
        print(f"[INFO] Organizer with mobile '{contact_mobile}' already exists!")
        print(f"   Name: {organizer.name}")
        print(f"   Email: {organizer.email}")
        print(f"   Status: {organizer.status}")
        print(f"   Has Password: {'Yes' if organizer.password else 'No'}")
        
        # Automatically reset password and ensure status is active
        organizer.set_password(password)
        organizer.status = 'active'
        organizer.save()
        print(f"[SUCCESS] Password reset successfully!")
        print(f"\n[CREDENTIALS] Updated Credentials:")
        print(f"   Mobile: {contact_mobile}")
        print(f"   Password: {password}")
        return
    
    # Create new organizer
    try:
        organizer = Organizer.objects.create(
            name=name,
            email=email,
            phone=phone,
            contact_mobile=contact_mobile,
            category=category,
            location=location,
            status='active',
            verified=True,
        )
        
        # Set password
        organizer.set_password(password)
        organizer.save()
        
        print("[SUCCESS] Test organizer created successfully!")
        print(f"\n[CREDENTIALS] Organizer Credentials:")
        print(f"   Mobile Number: {contact_mobile}")
        print(f"   Password: {password}")
        print(f"   Name: {name}")
        print(f"   Email: {email}")
        print(f"   Status: {organizer.status}")
        print(f"\n[INFO] You can now login to the organizer portal with these credentials.")
        print(f"[NOTE] After login, you'll receive an OTP on your mobile number.")
        
    except Exception as e:
        print(f"[ERROR] Error creating organizer: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    create_test_organizer()

