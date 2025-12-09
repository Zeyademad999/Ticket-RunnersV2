"""
NFC Card models for TicketRunners.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from customers.models import Customer
from users.models import MerchantLocation
import uuid


class NFCCard(models.Model):
    """
    NFC Card model for TicketRunners.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('expired', 'Expired'),
        ('blocked', 'Blocked'),
    ]
    
    CARD_TYPE_CHOICES = [
        ('standard', 'Standard'),
        ('premium', 'Premium'),
        ('vip', 'VIP'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    serial_number = models.CharField(max_length=100, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nfc_cards',
        db_index=True
    )
    collector = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='collected_cards',
        help_text="Authorized person to collect this card on behalf of the owner"
    )
    merchant = models.ForeignKey(
        MerchantLocation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nfc_cards',
        db_index=True
    )
    assigned_at = models.DateTimeField(null=True, blank=True, db_index=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    hashed_code = models.CharField(max_length=255, blank=True, null=True)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True, db_index=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    last_used = models.DateTimeField(null=True, blank=True)
    usage_count = models.IntegerField(default=0)
    card_type = models.CharField(max_length=20, choices=CARD_TYPE_CHOICES, default='standard')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'nfc_cards'
        verbose_name = 'NFC Card'
        verbose_name_plural = 'NFC Cards'
        indexes = [
            models.Index(fields=['serial_number']),
            models.Index(fields=['status']),
            models.Index(fields=['customer']),
            models.Index(fields=['merchant']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['status', 'customer']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.serial_number} - {self.get_status_display()}"
    
    def record_usage(self):
        """
        Record card usage (called when card is scanned at an event).
        """
        self.usage_count += 1
        self.last_used = timezone.now()
        self.save(update_fields=['usage_count', 'last_used'])


class NFCCardAutoReload(models.Model):
    """
    Auto-reload settings for NFC cards.
    """
    nfc_card = models.OneToOneField(
        NFCCard,
        on_delete=models.CASCADE,
        related_name='auto_reload_settings',
        db_index=True
    )
    threshold_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Balance threshold to trigger auto-reload"
    )
    reload_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Amount to reload when threshold is reached"
    )
    enabled = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'nfc_card_auto_reload'
        verbose_name = 'NFC Card Auto Reload'
        verbose_name_plural = 'NFC Card Auto Reloads'
        indexes = [
            models.Index(fields=['nfc_card']),
            models.Index(fields=['enabled']),
        ]
    
    def __str__(self):
        return f"Auto-reload for {self.nfc_card.serial_number}"


class NFCCardTransaction(models.Model):
    """
    NFC card transaction history model.
    """
    TRANSACTION_TYPE_CHOICES = [
        ('reload', 'Reload'),
        ('purchase', 'Purchase'),
        ('refund', 'Refund'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nfc_card = models.ForeignKey(
        NFCCard,
        on_delete=models.CASCADE,
        related_name='transactions',
        db_index=True
    )
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_before = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        db_table = 'nfc_card_transactions'
        verbose_name = 'NFC Card Transaction'
        verbose_name_plural = 'NFC Card Transactions'
        indexes = [
            models.Index(fields=['nfc_card']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.amount} for {self.nfc_card.serial_number}"


class NFCCardSettings(models.Model):
    """
    NFC Card pricing and deactivation settings (singleton model).
    """
    # Pricing
    first_purchase_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=50.00,
        validators=[MinValueValidator(0)],
        help_text="Cost for first-time NFC card purchase (in EGP)"
    )
    renewal_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=30.00,
        validators=[MinValueValidator(0)],
        help_text="Fee for renewing an NFC card (in EGP)"
    )
    
    # Deactivation settings
    deactivation_days_before_expiry = models.IntegerField(
        default=30,
        validators=[MinValueValidator(0)],
        help_text="Number of days before expiry date when cards should be deactivated (0 = deactivate on expiry date)"
    )
    auto_deactivate_expired = models.BooleanField(
        default=True,
        help_text="Automatically deactivate cards when they expire"
    )
    
    # Card validity period
    card_validity_days = models.IntegerField(
        default=365,
        validators=[MinValueValidator(1)],
        help_text="Number of days a card is valid from issue date"
    )
    
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'authentication.AdminUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nfc_card_settings_updates'
    )
    
    class Meta:
        db_table = 'nfc_card_settings'
        verbose_name = 'NFC Card Settings'
        verbose_name_plural = 'NFC Card Settings'
    
    def __str__(self):
        return f"NFC Card Settings (Purchase: {self.first_purchase_cost} EGP, Renewal: {self.renewal_fee} EGP)"
    
    @classmethod
    def get_settings(cls):
        """
        Get or create the singleton settings instance.
        """
        settings, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'first_purchase_cost': 50.00,
                'renewal_fee': 30.00,
                'deactivation_days_before_expiry': 30,
                'auto_deactivate_expired': True,
                'card_validity_days': 365,
            }
        )
        return settings
    
    def save(self, *args, **kwargs):
        """
        Ensure only one settings instance exists.
        """
        self.pk = 1
        super().save(*args, **kwargs)
