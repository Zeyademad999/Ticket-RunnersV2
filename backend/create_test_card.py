"""
Script to create a test NFC card linked to a customer.
Run with: python manage.py shell < create_test_card.py
Or: python manage.py shell then copy-paste the code
"""
import os
import django
import sys

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketrunners.settings')
django.setup()

from customers.models import Customer
from nfc_cards.models import NFCCard
from users.models import Merchant
from django.utils import timezone
from datetime import timedelta
import uuid

# Find or get a merchant (use the test merchant)
test_merchant_mobile = "01104484492"  # Same as test merchant mobile
merchant = None

try:
    merchant = Merchant.objects.get(mobile_number=test_merchant_mobile)
    print(f"Found merchant: {merchant.business_name} (ID: {merchant.id})")
except Merchant.DoesNotExist:
    # Get first available merchant
    merchant = Merchant.objects.filter(status='active').first()
    if merchant:
        print(f"Using first active merchant: {merchant.business_name} (ID: {merchant.id})")
    else:
        print("No merchants found. Please create a merchant first.")
        sys.exit(1)

# Find or create a test customer
# Try to find an existing customer with mobile number
test_mobile = "01104484492"  # You can change this to your test customer's mobile
customer = None

try:
    customer = Customer.objects.get(mobile_number=test_mobile)
    print(f"Found existing customer: {customer.name} (ID: {customer.id})")
except Customer.DoesNotExist:
    # Get first available customer
    customer = Customer.objects.filter(status='active').first()
    if customer:
        print(f"Using first active customer: {customer.name} (ID: {customer.id}, Mobile: {customer.mobile_number})")
    else:
        print("No active customers found. Creating a test customer...")
        customer = Customer.objects.create(
            name="Test Customer",
            email="test@example.com",
            mobile_number=test_mobile,
            phone=test_mobile,
            status='active',
            fees_paid=True
        )
        print(f"Created test customer: {customer.name} (ID: {customer.id})")

# Create a test NFC card with a mock serial number
serial_number = "TEST-CARD-1F556673"  # Use the same serial number
print(f"\nCreating/updating NFC card with serial number: {serial_number}")

# Check if card already exists
existing_card = NFCCard.objects.filter(serial_number=serial_number).first()
if existing_card:
    print(f"Card with serial {serial_number} already exists. Updating it...")
    card = existing_card
else:
    card = NFCCard()

card.serial_number = serial_number
card.customer = customer
card.merchant = merchant  # Assign to merchant so it can be used in merchant portal
card.status = 'active'
card.issue_date = timezone.now().date()
card.expiry_date = timezone.now().date() + timedelta(days=365)  # 1 year from issue date
card.balance = 0.00
card.card_type = 'standard'
card.assigned_at = timezone.now()
card.save()

print(f"\nSuccessfully created/updated NFC card:")
print(f"  Serial Number: {card.serial_number}")
print(f"  Merchant: {card.merchant.business_name if card.merchant else 'None'} (ID: {card.merchant.id if card.merchant else 'None'})")
print(f"  Customer: {card.customer.name} (ID: {card.customer.id})")
print(f"  Customer Mobile: {card.customer.mobile_number}")
print(f"  Status: {card.status}")
print(f"  Issue Date: {card.issue_date}")
print(f"  Expiry Date: {card.expiry_date}")
print(f"  Balance: {card.balance}")
print(f"\nYou can now test the card linking in the merchant portal!")
print(f"Card serial: {card.serial_number}")
print(f"Merchant mobile: {merchant.mobile_number}")
print(f"Customer mobile: {card.customer.mobile_number}")

