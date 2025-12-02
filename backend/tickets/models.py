"""
Tickets models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from datetime import timedelta
import uuid
import secrets


class Ticket(models.Model):
    """
    Ticket model.
    """
    STATUS_CHOICES = [
        ('valid', 'Valid'),
        ('used', 'Used'),
        ('refunded', 'Refunded'),
        ('banned', 'Banned'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='tickets',
        db_index=True
    )
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='tickets',
        db_index=True,
        help_text="Current ticket owner (may be buyer or assigned person)"
    )
    buyer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='purchased_tickets',
        db_index=True,
        null=True,
        blank=True,
        help_text="Original purchaser (who paid for the ticket)"
    )
    category = models.CharField(max_length=50)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    purchase_date = models.DateTimeField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='valid',
        db_index=True
    )
    check_in_time = models.DateTimeField(null=True, blank=True)
    dependents = models.PositiveIntegerField(default=0)
    ticket_number = models.CharField(max_length=50, unique=True, db_index=True)
    # Fields for ticket assignment to someone else
    assigned_name = models.CharField(max_length=255, null=True, blank=True)
    assigned_mobile = models.CharField(max_length=20, null=True, blank=True, db_index=True)
    assigned_email = models.EmailField(null=True, blank=True)
    # Child information (for owner tickets)
    has_child = models.BooleanField(default=False, help_text="Ticket holder has a child")
    child_age = models.PositiveIntegerField(null=True, blank=True, help_text="Age of the child")
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'tickets'
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'
        indexes = [
            models.Index(fields=['event']),
            models.Index(fields=['customer']),
            models.Index(fields=['status']),
            models.Index(fields=['ticket_number']),
            models.Index(fields=['purchase_date']),
            models.Index(fields=['event', 'status']),
        ]
        ordering = ['-purchase_date']
    
    def __str__(self):
        return f"Ticket {self.ticket_number} - {self.event.title}"
    
    def mark_as_used(self):
        """
        Mark ticket as used and set check-in time.
        """
        if self.status == 'valid':
            self.status = 'used'
            self.check_in_time = timezone.now()
            self.save(update_fields=['status', 'check_in_time'])
            return True
        return False
    
    def refund(self):
        """
        Mark ticket as refunded.
        """
        if self.status in ['valid', 'used']:
            self.status = 'refunded'
            self.save(update_fields=['status'])
            return True
        return False


class TicketTransfer(models.Model):
    """
    Ticket transfer history model.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='transfers',
        db_index=True
    )
    from_customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='transferred_tickets',
        db_index=True
    )
    to_customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='received_tickets',
        db_index=True,
        null=True,
        blank=True
    )
    transfer_date = models.DateTimeField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'ticket_transfers'
        verbose_name = 'Ticket Transfer'
        verbose_name_plural = 'Ticket Transfers'
        indexes = [
            models.Index(fields=['ticket']),
            models.Index(fields=['transfer_date']),
            models.Index(fields=['status']),
        ]
        ordering = ['-transfer_date']
    
    def __str__(self):
        to_name = self.to_customer.name if self.to_customer else "Pending"
        return f"Transfer {self.ticket.ticket_number} from {self.from_customer.name} to {to_name}"


class TicketRegistrationToken(models.Model):
    """
    Token model for registration links when tickets are purchased for non-registered users.
    """
    token = models.CharField(max_length=64, unique=True, db_index=True)
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='registration_tokens',
        db_index=True
    )
    phone_number = models.CharField(max_length=20, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(db_index=True)
    used = models.BooleanField(default=False, db_index=True)
    
    class Meta:
        db_table = 'ticket_registration_tokens'
        verbose_name = 'Ticket Registration Token'
        verbose_name_plural = 'Ticket Registration Tokens'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['phone_number']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['used']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Registration token for {self.phone_number} - Ticket {self.ticket.ticket_number}"
    
    @classmethod
    def generate_token(cls):
        """
        Generate a unique token for registration.
        Using 32 bytes (24 chars base64) to keep URL shorter for SMS compatibility.
        """
        while True:
            token = secrets.token_urlsafe(32)  # ~43 characters when base64 encoded (shorter for SMS)
            if not cls.objects.filter(token=token).exists():
                return token
    
    @classmethod
    def create_for_ticket(cls, ticket, phone_number, expires_in_days=7):
        """
        Create a registration token for a ticket.
        
        Args:
            ticket: Ticket instance
            phone_number: Phone number for the token
            expires_in_days: Number of days until token expires (default 7)
        
        Returns:
            TicketRegistrationToken instance
        """
        import logging
        logger = logging.getLogger(__name__)
        
        token = cls.generate_token()
        expires_at = timezone.now() + timedelta(days=expires_in_days)
        
        token_obj = cls.objects.create(
            token=token,
            ticket=ticket,
            phone_number=phone_number,
            expires_at=expires_at
        )
        
        print("=" * 80)
        print("🎫 REGISTRATION TOKEN CREATED")
        print(f"   Token ID: {token_obj.id}")
        print(f"   Ticket ID: {ticket.id}")
        print(f"   Phone: {phone_number}")
        print(f"   Token (first 30 chars): {token[:30]}...")
        print(f"   Full token: {token}")
        print(f"   Expires at: {expires_at}")
        print("=" * 80)
        logger.info(f"Created registration token for ticket {ticket.id}, phone: {phone_number}, token (first 20 chars): {token[:20]}..., expires_at: {expires_at}")
        
        return token_obj
    
    def is_valid(self):
        """
        Check if token is valid (not expired and not used).
        """
        return not self.used and timezone.now() < self.expires_at
    
    def mark_as_used(self):
        """
        Mark token as used.
        """
        self.used = True
        self.save(update_fields=['used'])
