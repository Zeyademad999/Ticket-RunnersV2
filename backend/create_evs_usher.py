#!/usr/bin/env python
"""
Script to create EVS (Usher) credentials for TicketRunners EVS Portal.
Run this script from the backend directory:
    python create_evs_usher.py

This script will:
1. Create an AdminUser with USHER role
2. Create a Usher profile linked to the AdminUser
3. Assign the usher to an event (or create a test event if none exists)
4. Provide login credentials
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketrunners.settings')
django.setup()

from authentication.models import AdminUser
from users.models import Usher, Organizer
from events.models import Event
from venues.models import Venue
from django.utils import timezone
from datetime import timedelta


def create_evs_usher():
    """Create EVS usher credentials."""
    username = 'usher'
    password = 'evs123'
    name = 'EVS Usher'
    email = 'evs.usher@ticketrunners.com'
    phone = '01100000000'
    
    print("=" * 60)
    print("Creating EVS Usher Credentials")
    print("=" * 60)
    
    # Check if AdminUser already exists
    admin_user = AdminUser.objects.filter(username=username).first()
    
    if admin_user:
        print(f"[INFO] AdminUser with username '{username}' already exists!")
        print(f"   Email: {admin_user.email}")
        print(f"   Role: {admin_user.role}")
        print(f"   Active: {admin_user.is_active}")
        
        # Reset password
        admin_user.set_password(password)
        admin_user.is_active = True
        admin_user.role = 'USHER'
        admin_user.save()
        print(f"[SUCCESS] Password reset and role updated!")
    else:
        # Create AdminUser
        try:
            admin_user = AdminUser.objects.create_user(
                username=username,
                email=email,
                password=password,
                role='USHER',
                is_active=True,
                is_staff=False,
            )
            print(f"[SUCCESS] AdminUser created successfully!")
        except Exception as e:
            print(f"[ERROR] Error creating AdminUser: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
    
    # Check if Usher profile exists (by user or email)
    usher = Usher.objects.filter(user=admin_user).first()
    if not usher:
        usher = Usher.objects.filter(email=email).first()
    
    if usher:
        print(f"[INFO] Usher profile already exists!")
        print(f"   Name: {usher.name}")
        print(f"   Status: {usher.status}")
        print(f"   Assigned Events: {usher.events.count()}")
        
        # Update usher details
        usher.user = admin_user
        usher.name = name
        usher.email = email
        usher.phone = phone
        usher.status = 'active'
        usher.role = 'general'
        usher.save()
        print(f"[SUCCESS] Usher profile updated!")
    else:
        # Create Usher profile
        try:
            usher = Usher.objects.create(
                user=admin_user,
                name=name,
                email=email,
                phone=phone,
                role='general',
                status='active',
                location='Cairo, Egypt',
            )
            print(f"[SUCCESS] Usher profile created successfully!")
        except Exception as e:
            print(f"[ERROR] Error creating Usher profile: {str(e)}")
            # Try to get existing usher by email and update it
            try:
                existing_usher = Usher.objects.get(email=email)
                existing_usher.user = admin_user
                existing_usher.name = name
                existing_usher.phone = phone
                existing_usher.status = 'active'
                existing_usher.role = 'general'
                existing_usher.save()
                usher = existing_usher
                print(f"[SUCCESS] Updated existing usher profile!")
            except Usher.DoesNotExist:
                import traceback
                traceback.print_exc()
                sys.exit(1)
    
    # Find or create an event to assign the usher to
    event = Event.objects.filter(status__in=['scheduled', 'ongoing']).first()
    
    if not event:
        print("\n[INFO] No active events found. Creating a test event...")
        
        # Get or create an organizer
        organizer = Organizer.objects.first()
        if not organizer:
            organizer = Organizer.objects.create(
                name='Test Organizer',
                email='organizer@test.com',
                phone='01111111111',
                contact_mobile='01111111111',
                status='active',
                verified=True,
            )
            organizer.set_password('password')
            organizer.save()
            print(f"[INFO] Created test organizer: {organizer.name}")
        
        # Get or create a venue
        venue = Venue.objects.first()
        if not venue:
            venue = Venue.objects.create(
                name='Test Venue',
                address='Cairo, Egypt',
                capacity=1000,
            )
            print(f"[INFO] Created test venue: {venue.name}")
        
        # Create test event
        event_date = timezone.now().date() + timedelta(days=7)
        event_time = timezone.now().time().replace(hour=18, minute=0)
        
        event = Event.objects.create(
            title='Test Event for EVS',
            description='Test event for EVS usher scanning',
            organizer=organizer,
            venue=venue,
            date=event_date,
            time=event_time,
            status='scheduled',
            total_tickets=100,
        )
        print(f"[SUCCESS] Created test event: {event.title}")
        print(f"   Event ID: {event.id}")
        print(f"   Date: {event.date}")
        print(f"   Status: {event.status}")
    
    # Assign usher to event
    if event not in usher.events.all():
        usher.events.add(event)
        print(f"\n[SUCCESS] Assigned usher to event: {event.title}")
    else:
        print(f"\n[INFO] Usher already assigned to event: {event.title}")
    
    # Print credentials
    print("\n" + "=" * 60)
    print("EVS USHER CREDENTIALS")
    print("=" * 60)
    print(f"Username: {username}")
    print(f"Password: {password}")
    print(f"Event ID: {event.id}")
    print(f"Event Name: {event.title}")
    print(f"Event Date: {event.date}")
    print(f"Event Status: {event.status}")
    print("\n" + "=" * 60)
    print("LOGIN INSTRUCTIONS")
    print("=" * 60)
    print("1. Open the EVS frontend application")
    print("2. Enter the Event ID above")
    print("3. Enter the Username and Password")
    print("4. Click 'Sign In'")
    print("\n" + "=" * 60)
    
    return {
        'username': username,
        'password': password,
        'event_id': str(event.id),
        'event_title': event.title,
    }


if __name__ == '__main__':
    try:
        credentials = create_evs_usher()
        print("\n[SUCCESS] EVS usher credentials created successfully!")
    except Exception as e:
        print(f"\n[ERROR] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

