"""
Django management command to delete a customer by phone number.

Usage:
    python manage.py delete_customer --phone 01104484492
    python manage.py delete_customer --phone 01104484492 --dry-run  # Preview without deleting
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from customers.models import Customer
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Delete a customer by phone number'

    def add_arguments(self, parser):
        parser.add_argument(
            '--phone',
            type=str,
            required=True,
            help='Phone number to search for (checks both phone and mobile_number fields)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview the customer that would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        phone_number = options['phone']
        dry_run = options['dry_run']

        self.stdout.write(self.style.SUCCESS(f'Searching for customer with phone number: {phone_number}'))
        
        # Try different phone number formats
        # Original format
        phone_variations = [phone_number]
        
        # If it starts with 0, try without 0 and with country code
        if phone_number.startswith('0'):
            # Remove leading 0: 01104484492 -> 1104484492
            phone_variations.append(phone_number[1:])
            # Add country code: 01104484492 -> 201104484492
            phone_variations.append('20' + phone_number[1:])
            # Add country code with +: 01104484492 -> +201104484492
            phone_variations.append('+20' + phone_number[1:])
        
        # If it doesn't start with +, try adding it
        if not phone_number.startswith('+'):
            phone_variations.append('+' + phone_number)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_variations = []
        for v in phone_variations:
            if v not in seen:
                seen.add(v)
                unique_variations.append(v)
        
        self.stdout.write(f'Trying phone number variations: {", ".join(unique_variations)}')
        
        # Search in both phone and mobile_number fields with all variations
        customers = Customer.objects.filter(
            Q(phone__in=unique_variations) | Q(mobile_number__in=unique_variations)
        )
        
        if not customers.exists():
            self.stdout.write(self.style.ERROR(f'[ERROR] No customer found with phone number: {phone_number}'))
            self.stdout.write('   Searched in both "phone" and "mobile_number" fields.')
            return
        
        customer_count = customers.count()
        if customer_count > 1:
            self.stdout.write(self.style.WARNING(f'[WARNING] Found {customer_count} customers with phone number: {phone_number}'))
            self.stdout.write('   All matching customers will be deleted.')
        
        for customer in customers:
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS('=' * 60))
            self.stdout.write(f'Found Customer:')
            self.stdout.write(f'  ID: {customer.id}')
            self.stdout.write(f'  Name: {customer.name}')
            self.stdout.write(f'  Email: {customer.email}')
            self.stdout.write(f'  Phone: {customer.phone}')
            self.stdout.write(f'  Mobile Number: {customer.mobile_number or "N/A"}')
            self.stdout.write(f'  Status: {customer.status}')
            self.stdout.write(f'  Registration Date: {customer.registration_date}')
            self.stdout.write(f'  Total Bookings: {customer.total_bookings}')
            self.stdout.write(f'  Total Spent: {customer.total_spent}')
            
            # Check for related data
            from tickets.models import Ticket
            ticket_count = Ticket.objects.filter(customer=customer).count()
            if ticket_count > 0:
                self.stdout.write(self.style.WARNING(f'  [WARNING] This customer has {ticket_count} ticket(s)'))
            
            if customer.user:
                self.stdout.write(self.style.WARNING(f'  [WARNING] This customer has a linked user account (ID: {customer.user.id})'))
            
            if dry_run:
                self.stdout.write(self.style.WARNING('  [DRY RUN] Would delete this customer'))
            else:
                try:
                    customer_id = customer.id
                    customer_name = customer.name
                    customer.delete()
                    self.stdout.write(self.style.SUCCESS(f'  [SUCCESS] Successfully deleted customer {customer_id} ({customer_name})'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  [ERROR] Error deleting customer: {str(e)}'))
                    logger.exception(f'Error deleting customer {customer.id}')
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nThis was a DRY RUN. No customers were deleted.'))
            self.stdout.write('Run without --dry-run to actually delete the customer(s).')
        else:
            self.stdout.write(self.style.SUCCESS(f'\n[SUCCESS] Deletion process completed.'))

