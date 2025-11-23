"""
Finances models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid


class Expense(models.Model):
    """
    Platform expenses model.
    """
    CATEGORY_CHOICES = [
        ('marketing', 'Marketing'),
        ('operations', 'Operations'),
        ('technology', 'Technology'),
        ('staff', 'Staff'),
        ('office', 'Office'),
        ('other', 'Other'),
    ]
    
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    description = models.TextField()
    date = models.DateField(default=timezone.now, db_index=True)
    created_by = models.ForeignKey(
        'authentication.AdminUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='expenses_created'
    )
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'expenses'
        verbose_name = 'Expense'
        verbose_name_plural = 'Expenses'
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['category']),
            models.Index(fields=['date', 'category']),
        ]
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.category} - {self.amount} on {self.date}"


class Payout(models.Model):
    """
    Organizer payouts model.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('paypal', 'PayPal'),
        ('stripe', 'Stripe'),
        ('other', 'Other'),
    ]
    
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    organizer = models.ForeignKey(
        'users.Organizer',
        on_delete=models.CASCADE,
        related_name='payouts',
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    method = models.CharField(
        max_length=20,
        choices=METHOD_CHOICES,
        default='bank_transfer'
    )
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payouts'
        verbose_name = 'Payout'
        verbose_name_plural = 'Payouts'
        indexes = [
            models.Index(fields=['organizer']),
            models.Index(fields=['status']),
            models.Index(fields=['reference']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payout {self.reference} - {self.amount}"


class CompanyFinance(models.Model):
    """
    Company financial records model.
    """
    date = models.DateField(default=timezone.now, db_index=True)
    revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    expenses = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    profit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'company_finances'
        verbose_name = 'Company Finance'
        verbose_name_plural = 'Company Finances'
        indexes = [
            models.Index(fields=['date']),
        ]
        ordering = ['-date']
    
    def __str__(self):
        return f"Finance record for {self.date}"


class ProfitShare(models.Model):
    """
    Profit share agreements model.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('completed', 'Completed'),
    ]
    
    partner_name = models.CharField(max_length=200, db_index=True)
    share_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    date = models.DateField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'profit_shares'
        verbose_name = 'Profit Share'
        verbose_name_plural = 'Profit Shares'
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['status']),
        ]
        ordering = ['-date']
    
    def __str__(self):
        return f"Profit Share - {self.partner_name} ({self.share_percentage}%)"


class Settlement(models.Model):
    """
    Financial settlements model.
    """
    TYPE_CHOICES = [
        ('payment', 'Payment'),
        ('refund', 'Refund'),
        ('adjustment', 'Adjustment'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    date = models.DateField(default=timezone.now, db_index=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'settlements'
        verbose_name = 'Settlement'
        verbose_name_plural = 'Settlements'
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['status']),
            models.Index(fields=['reference']),
        ]
        ordering = ['-date']
    
    def __str__(self):
        return f"Settlement {self.reference} - {self.amount}"


class Deposit(models.Model):
    """
    Capital deposits model.
    """
    SOURCE_CHOICES = [
        ('investment', 'Investment'),
        ('loan', 'Loan'),
        ('revenue', 'Revenue'),
        ('other', 'Other'),
    ]
    
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    source = models.CharField(
        max_length=50,
        choices=SOURCE_CHOICES,
        db_index=True
    )
    date = models.DateField(default=timezone.now, db_index=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'deposits'
        verbose_name = 'Deposit'
        verbose_name_plural = 'Deposits'
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['source']),
        ]
        ordering = ['-date']
    
    def __str__(self):
        return f"Deposit {self.amount} from {self.source} on {self.date}"


class ProfitWithdrawal(models.Model):
    """
    Profit withdrawal requests model.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]
    
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    request_date = models.DateField(default=timezone.now, db_index=True)
    processed_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'profit_withdrawals'
        verbose_name = 'Profit Withdrawal'
        verbose_name_plural = 'Profit Withdrawals'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['request_date']),
            models.Index(fields=['reference']),
        ]
        ordering = ['-request_date']
    
    def __str__(self):
        return f"Withdrawal {self.reference} - {self.amount}"
