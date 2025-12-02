#!/usr/bin/env python
"""
Simple script to fix profile images for all existing customer accounts.

This script runs the Django management command to fix profile images.

Usage:
    python fix_all_profile_images.py
    python fix_all_profile_images.py --dry-run  # Preview without saving
    python fix_all_profile_images.py --customer-id 13  # Fix specific customer
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketrunners.settings')
django.setup()

from django.core.management import call_command

if __name__ == '__main__':
    # Parse command line arguments
    args = sys.argv[1:] if len(sys.argv) > 1 else []
    
    print("=" * 60)
    print("Profile Image Fix Script")
    print("=" * 60)
    print()
    
    # Run the management command
    call_command('fix_profile_images', *args)
    
    print()
    print("=" * 60)
    print("Script completed!")
    print("=" * 60)

