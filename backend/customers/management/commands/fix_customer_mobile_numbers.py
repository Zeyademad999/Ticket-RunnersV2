"""
Django management command to fix mobile_number fields for existing customers.

This command:
1. Finds all customers with phone but missing/null mobile_number
2. Normalizes phone numbers and copies to mobile_number
3. Ensures mobile_number is set for login authentication

Usage:
    python manage.py fix_customer_mobile_numbers
    python manage.py fix_customer_mobile_numbers --dry-run  # Preview changes without saving
    python manage.py fix_customer_mobile_numbers --phone 01012900990  # Fix specific customer
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from customers.models import Customer
import logging

logger = logging.getLogger(__name__)


def normalize_mobile_number(mobile_number: str) -> str:
    """
    Normalize mobile number to handle different formats.
    Converts Egyptian numbers from 01104484492 to +201104484492 format.
    """
    if not mobile_number:
        return mobile_number
    
    # Remove any whitespace
    mobile_number = mobile_number.strip()
    
    # If it starts with +20, return as is
    if mobile_number.startswith('+20'):
        return mobile_number
    
    # If it starts with 20 (without +), add +
    if mobile_number.startswith('20') and len(mobile_number) >= 12:
        return '+' + mobile_number
    
    # If it starts with 0 (Egyptian local format), replace 0 with +20
    if mobile_number.startswith('0') and len(mobile_number) == 11:
        return '+20' + mobile_number[1:]
    
    # If it's 10 digits starting with 1 (Egyptian mobile without leading 0)
    if mobile_number.startswith('1') and len(mobile_number) == 10:
        return '+20' + mobile_number
    
    # Return as is if no pattern matches
    return mobile_number


class Command(BaseCommand):
    help = 'Fix mobile_number fields for existing customer accounts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without actually saving them',
        )
        parser.add_argument(
            '--phone',
            type=str,
            help='Fix mobile_number for a specific phone number',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        phone_number = options.get('phone')

        self.stdout.write(self.style.SUCCESS('Starting mobile_number fix...'))
        
        if phone_number:
            # Find customer by phone number
            phone_variations = [phone_number]
            if phone_number.startswith('0'):
                phone_variations.append(phone_number[1:])
                phone_variations.append('20' + phone_number[1:])
                phone_variations.append('+20' + phone_number[1:])
            if not phone_number.startswith('+'):
                phone_variations.append('+' + phone_number)
            
            customers = Customer.objects.filter(
                Q(phone__in=phone_variations) | Q(mobile_number__in=phone_variations)
            )
            
            if not customers.exists():
                self.stdout.write(self.style.ERROR(f'No customer found with phone number: {phone_number}'))
                return
        else:
            # Find all customers that need fixing
            # Customers with phone but missing/null mobile_number, or mobile_number not normalized
            customers = Customer.objects.filter(
                Q(mobile_number__isnull=True) | Q(mobile_number='')
            ).exclude(phone__isnull=True).exclude(phone='')
        
        total = customers.count()
        fixed = 0
        errors = 0
        skipped = 0

        self.stdout.write(f'Found {total} customer(s) to process')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))

        for customer in customers:
            try:
                original_phone = customer.phone
                original_mobile = customer.mobile_number
                
                if not original_phone:
                    skipped += 1
                    self.stdout.write(f'  [SKIP] Customer {customer.id} ({customer.name}): No phone number')
                    continue
                
                # Normalize phone number
                normalized_phone = normalize_mobile_number(original_phone)
                
                # Set mobile_number if missing or different
                if not customer.mobile_number or customer.mobile_number != normalized_phone:
                    if dry_run:
                        self.stdout.write(
                            f'  [DRY RUN] Customer {customer.id} ({customer.name}): '
                            f'Would set mobile_number from "{original_mobile}" to "{normalized_phone}"'
                        )
                    else:
                        customer.mobile_number = normalized_phone
                        # Also normalize phone field
                        customer.phone = normalized_phone
                        customer.save(update_fields=['mobile_number', 'phone'])
                        self.stdout.write(
                            f'  [FIXED] Customer {customer.id} ({customer.name}): '
                            f'Set mobile_number to "{normalized_phone}"'
                        )
                    fixed += 1
                else:
                    skipped += 1
                    self.stdout.write(
                        f'  [SKIP] Customer {customer.id} ({customer.name}): '
                        f'mobile_number already correct: "{customer.mobile_number}"'
                    )
                    
            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'  [ERROR] Customer {customer.id} ({customer.name}): {str(e)}'
                    )
                )
                logger.error(f'Error fixing customer {customer.id}: {str(e)}', exc_info=True)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Summary:'))
        self.stdout.write(f'  Total: {total}')
        self.stdout.write(f'  Fixed: {fixed}')
        self.stdout.write(f'  Skipped: {skipped}')
        self.stdout.write(f'  Errors: {errors}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a dry run. No changes were saved.'))

