"""
Payment models for TicketRunners platform.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid


class PaymentTransaction(models.Model):
    """
    Payment transaction model for ticket bookings.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('nfc_card', 'NFC Card'),
        ('digital_wallet', 'Digital Wallet'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='payment_transactions',
        db_index=True
    )
    ticket = models.ForeignKey(
        'tickets.Ticket',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_transactions',
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    transaction_id = models.CharField(max_length=100, unique=True, db_index=True, help_text="External payment gateway transaction ID")
    payment_gateway_response = models.TextField(blank=True, null=True, help_text="Raw response from payment gateway")
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_transactions'
        verbose_name = 'Payment Transaction'
        verbose_name_plural = 'Payment Transactions'
        indexes = [
            models.Index(fields=['customer']),
            models.Index(fields=['ticket']),
            models.Index(fields=['status']),
            models.Index(fields=['transaction_id']),
            models.Index(fields=['created_at']),
            models.Index(fields=['payment_method']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment {self.transaction_id} - {self.amount} ({self.status})"

