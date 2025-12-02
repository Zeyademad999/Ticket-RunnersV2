"""
NFC Cards models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid


class NFCCard(models.Model):
    """
    NFC card model.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('expired', 'Expired'),
    ]
    
    CARD_TYPE_CHOICES = [
        ('standard', 'Standard'),
        ('premium', 'Premium'),
        ('vip', 'VIP'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    serial_number = models.CharField(max_length=100, unique=True, db_index=True)
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nfc_cards',
        db_index=True
    )
    merchant = models.ForeignKey(
        'users.Merchant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_cards',
        db_index=True,
        help_text="Merchant who assigned this card"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    assigned_at = models.DateTimeField(null=True, blank=True, db_index=True, help_text="When card was assigned to customer")
    delivered_at = models.DateTimeField(null=True, blank=True, db_index=True, help_text="When card was delivered to customer")
    hashed_code = models.CharField(max_length=255, blank=True, null=True, help_text="Hashed code for card writing")
    issue_date = models.DateField(default=timezone.now, db_index=True)
    expiry_date = models.DateField(db_index=True)
    balance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    last_used = models.DateTimeField(null=True, blank=True, db_index=True)
    usage_count = models.PositiveIntegerField(default=0)
    card_type = models.CharField(
        max_length=20,
        choices=CARD_TYPE_CHOICES,
        default='standard'
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'nfc_cards'
        verbose_name = 'NFC Card'
        verbose_name_plural = 'NFC Cards'
        indexes = [
            models.Index(fields=['serial_number']),
            models.Index(fields=['customer']),
            models.Index(fields=['merchant']),
            models.Index(fields=['status']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['assigned_at']),
            models.Index(fields=['delivered_at']),
            models.Index(fields=['status', 'expiry_date']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"NFC Card {self.serial_number}"
    
    def is_expired(self):
        """
        Check if card is expired.
        """
        from django.utils import timezone
        return timezone.now().date() > self.expiry_date
    
    def update_balance(self, amount):
        """
        Update card balance.
        """
        new_balance = self.balance + amount
        if new_balance < 0:
            return False
        self.balance = new_balance
        self.save(update_fields=['balance'])
        return True
    
    def record_usage(self):
        """
        Record card usage.
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
        ('credit', 'Credit'),
        ('debit', 'Debit'),
        ('refund', 'Refund'),
    ]
    
    card = models.ForeignKey(
        NFCCard,
        on_delete=models.CASCADE,
        related_name='transactions',
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        db_index=True
    )
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        db_table = 'nfc_card_transactions'
        verbose_name = 'NFC Card Transaction'
        verbose_name_plural = 'NFC Card Transactions'
        indexes = [
            models.Index(fields=['card']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['transaction_type']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.transaction_type} {self.amount} on {self.card.serial_number}"
