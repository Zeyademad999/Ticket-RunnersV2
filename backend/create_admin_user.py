#!/usr/bin/env python
"""
Script to create an admin user for TicketRunners Admin Dashboard.
Run this script from the backend directory:
    python create_admin_user.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketrunners.settings')
django.setup()

from authentication.models import AdminUser

def create_admin_user():
    """Create a super admin user."""
    username = 'admin'
    email = 'admin@ticketrunners.com'
    password = 'admin123'
    role = 'SUPER_ADMIN'
    
    # Check if user already exists
    if AdminUser.objects.filter(username=username).exists():
        print(f"❌ Admin user '{username}' already exists!")
        user = AdminUser.objects.get(username=username)
        print(f"   User ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Role: {user.get_role_display()}")
        print(f"   Is Active: {user.is_active}")
        
        # Ask if user wants to reset password
        response = input("\nDo you want to reset the password? (y/n): ")
        if response.lower() == 'y':
            user.set_password(password)
            user.is_active = True
            user.is_staff = True
            user.is_superuser = True
            user.role = role
            user.save()
            print(f"✅ Password reset successfully!")
            print(f"\n📋 Updated Credentials:")
            print(f"   Username: {username}")
            print(f"   Password: {password}")
        else:
            print("Password not changed.")
        return
    
    # Create new admin user
    try:
        admin_user = AdminUser.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=role,
            is_staff=True,
            is_superuser=True,
            is_active=True,
            first_name='System',
            last_name='Administrator'
        )
        
        print("✅ Admin user created successfully!")
        print(f"\n📋 Admin Credentials:")
        print(f"   Username: {username}")
        print(f"   Password: {password}")
        print(f"   Email: {email}")
        print(f"   Role: {admin_user.get_role_display()}")
        print(f"\n🔐 You can now login to the admin dashboard with these credentials.")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    create_admin_user()

