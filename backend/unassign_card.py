"""
Script to unassign NFC card from a customer for testing.
Run with: python manage.py shell < unassign_card.py
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

# Find customer
customer_mobile = "01104484492"
try:
    customer = Customer.objects.get(mobile_number=customer_mobile)
    print(f"Found customer: {customer.name} (ID: {customer.id})")
    
    # Find all cards assigned to this customer
    cards = NFCCard.objects.filter(customer=customer)
    print(f"\nFound {cards.count()} card(s) assigned to this customer:")
    
    for card in cards:
        print(f"  - Card: {card.serial_number}, Status: {card.status}")
    
    # Unassign all cards
    for card in cards:
        card.customer = None
        card.assigned_at = None
        card.status = 'active'  # Keep status as active but unassigned
        card.save()
        print(f"\nUnassigned card: {card.serial_number}")
        print(f"  Customer: None")
        print(f"  Status: {card.status}")
        print(f"  Assigned At: None")
    
    print(f"\nSuccessfully unassigned {cards.count()} card(s) from customer {customer.name}")
    print(f"You can now test the card assignment flow again!")
    
except Customer.DoesNotExist:
    print(f"Customer with mobile {customer_mobile} not found")
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()

