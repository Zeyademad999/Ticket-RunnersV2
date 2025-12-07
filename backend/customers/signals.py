"""
Signals for customers app.
"""
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from .models import Customer


@receiver(pre_delete, sender=Customer)
def deactivate_marketplace_listings_on_customer_delete(sender, instance, **kwargs):
    """
    Deactivate all marketplace listings when a customer is deleted.
    """
    from tickets.models import TicketMarketplaceListing
    
    # Deactivate all active marketplace listings for this customer
    TicketMarketplaceListing.objects.filter(
        customer=instance,
        is_active=True
    ).update(is_active=False)

