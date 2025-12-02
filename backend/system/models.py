"""
System models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone


class SystemLog(models.Model):
    """
    System activity logs model.
    """
    CATEGORY_CHOICES = [
        ('authentication', 'Authentication'),
        ('event', 'Event'),
        ('ticket', 'Ticket'),
        ('customer', 'Customer'),
        ('user', 'User'),
        ('financial', 'Financial'),
        ('system', 'System'),
        ('other', 'Other'),
    ]
    
    SEVERITY_CHOICES = [
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('CRITICAL', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILURE', 'Failure'),
        ('PENDING', 'Pending'),
    ]
    
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    user = models.ForeignKey(
        'authentication.AdminUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_logs',
        db_index=True
    )
    user_role = models.CharField(max_length=20, blank=True, db_index=True)
    action = models.CharField(max_length=200, db_index=True)
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        db_index=True
    )
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='INFO',
        db_index=True
    )
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='SUCCESS',
        db_index=True
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'system_logs'
        verbose_name = 'System Log'
        verbose_name_plural = 'System Logs'
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['user']),
            models.Index(fields=['category']),
            models.Index(fields=['severity']),
            models.Index(fields=['timestamp', 'category']),
            models.Index(fields=['timestamp', 'severity']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.action} - {self.timestamp}"


class CheckinLog(models.Model):
    """
    Ticket check-in logs model.
    """
    SCAN_RESULT_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('duplicate', 'Duplicate'),
        ('invalid', 'Invalid'),
    ]
    
    SCAN_TYPE_CHOICES = [
        ('nfc', 'NFC'),
        ('qr', 'QR Code'),
        ('manual', 'Manual'),
    ]
    
    CARD_STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('expired', 'Expired'),
    ]
    
    DEVICE_TYPE_CHOICES = [
        ('mobile', 'Mobile'),
        ('tablet', 'Tablet'),
        ('desktop', 'Desktop'),
        ('scanner', 'Scanner'),
    ]
    
    NETWORK_STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('syncing', 'Syncing'),
    ]
    
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checkin_logs',
        db_index=True
    )
    customer_email = models.EmailField(blank=True)
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checkin_logs',
        db_index=True
    )
    event_title = models.CharField(max_length=200, blank=True)
    venue = models.ForeignKey(
        'venues.Venue',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checkin_logs'
    )
    entry_point = models.CharField(max_length=100, blank=True)
    nfc_card = models.ForeignKey(
        'nfc_cards.NFCCard',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checkin_logs',
        db_index=True
    )
    card_status = models.CharField(
        max_length=20,
        choices=CARD_STATUS_CHOICES,
        blank=True
    )
    scan_result = models.CharField(
        max_length=20,
        choices=SCAN_RESULT_CHOICES,
        db_index=True
    )
    scan_type = models.CharField(
        max_length=20,
        choices=SCAN_TYPE_CHOICES,
        db_index=True
    )
    device_name = models.CharField(max_length=200, blank=True)
    device_type = models.CharField(
        max_length=20,
        choices=DEVICE_TYPE_CHOICES,
        blank=True
    )
    operator = models.ForeignKey(
        'authentication.AdminUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checkin_logs'
    )
    operator_role = models.CharField(max_length=50, blank=True)
    processing_time = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True
    )  # in seconds
    signal_strength = models.CharField(max_length=50, blank=True)
    battery_level = models.PositiveIntegerField(null=True, blank=True)  # percentage
    network_status = models.CharField(
        max_length=20,
        choices=NETWORK_STATUS_CHOICES,
        blank=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'checkin_logs'
        verbose_name = 'Check-in Log'
        verbose_name_plural = 'Check-in Logs'
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['event']),
            models.Index(fields=['customer']),
            models.Index(fields=['nfc_card']),
            models.Index(fields=['scan_result']),
            models.Index(fields=['scan_type']),
            models.Index(fields=['timestamp', 'event']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"Check-in {self.event_title} - {self.timestamp}"
