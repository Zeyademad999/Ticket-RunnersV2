"""
Finances models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
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
        db_index=True,
        help_text="Expense category (can be any value, not restricted to predefined choices)"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    description = models.TextField()
    date = models.DateField(default=timezone.now, db_index=True)
    deduct_from_wallet = models.BooleanField(
        default=False,
        help_text="Whether to deduct this expense from a wallet"
    )
    wallet_type = models.CharField(
        max_length=20,
        choices=[
            ('company', 'Company Wallet'),
            ('owner', 'Owner Wallet'),
        ],
        blank=True,
        null=True,
        help_text="Type of wallet to deduct from"
    )
    wallet_id = models.UUIDField(
        blank=True,
        null=True,
        help_text="ID of the wallet to deduct from (required if deduct_from_wallet is True)"
    )
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


class Deduction(models.Model):
    """
    Custom deductions model for revenue calculations.
    Deductions can be applied to total revenue (tickets + EVS cards).
    """
    TYPE_CHOICES = [
        ('percentage', 'Percentage of Total Revenue'),
        ('fixed_per_ticket', 'Fixed Amount per Ticket Sold'),
    ]
    
    name = models.CharField(max_length=200, db_index=True, help_text="Name of the deduction")
    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Deduction value (percentage or fixed amount)"
    )
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        db_index=True,
        help_text="Type of deduction: percentage of total revenue or fixed amount per ticket"
    )
    applies_to = models.CharField(
        max_length=20,
        choices=[
            ('tickets', 'Tickets Sold Revenue'),
            ('nfc_cards', 'NFC Card Revenue'),
        ],
        default='tickets',
        db_index=True,
        help_text="Which revenue stream this deduction applies to"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this deduction is currently active"
    )
    description = models.TextField(blank=True, help_text="Optional description of the deduction")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'authentication.AdminUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='deductions_created'
    )
    
    class Meta:
        db_table = 'deductions'
        verbose_name = 'Deduction'
        verbose_name_plural = 'Deductions'
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['type']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        type_display = 'Percentage' if self.type == 'percentage' else 'Fixed per Ticket'
        return f"{self.name} - {self.value} ({type_display})"
    
    def calculate_amount(self, total_revenue=None, tickets_sold=None):
        """
        Calculate the deduction amount based on type.
        
        Args:
            total_revenue: Total revenue (tickets + cards) for percentage calculations
            tickets_sold: Number of tickets sold for fixed_per_ticket calculations
        
        Returns:
            Decimal: The calculated deduction amount
        """
        from decimal import Decimal
        if not self.is_active:
            return Decimal('0.00')
        
        if self.type == 'percentage':
            if total_revenue is None:
                return Decimal('0.00')
            return Decimal(str(total_revenue)) * (self.value / 100)
        elif self.type == 'fixed_per_ticket':
            if tickets_sold is None:
                return Decimal('0.00')
            return self.value * Decimal(str(tickets_sold))
        return Decimal('0.00')


class Owner(models.Model):
    """
    Company owner model for managing owners and their company percentage.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, db_index=True)
    email = models.EmailField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    company_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Owner's percentage share in the company (0-100)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'owners'
        verbose_name = 'Owner'
        verbose_name_plural = 'Owners'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['name']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.company_percentage}%)"
    
    def generate_card_number(self):
        """
        Generate a unique card number for the owner's wallet card.
        Format: 4 groups of 4 digits (e.g., 1234 5678 9012 3456)
        """
        # Use first 16 characters of UUID (without dashes) and format
        uuid_str = str(self.id).replace('-', '')[:16]
        # Pad with zeros if needed
        uuid_str = uuid_str.ljust(16, '0')
        # Format as XXXX XXXX XXXX XXXX
        return f"{uuid_str[0:4]} {uuid_str[4:8]} {uuid_str[8:12]} {uuid_str[12:16]}"


class OwnerWallet(models.Model):
    """
    Owner wallet model for tracking individual owner wallet balances.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.OneToOneField(
        Owner,
        on_delete=models.CASCADE,
        related_name='wallet',
        db_index=True
    )
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Current wallet balance (can be negative)"
    )
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'owner_wallets'
        verbose_name = 'Owner Wallet'
        verbose_name_plural = 'Owner Wallets'
        indexes = [
            models.Index(fields=['owner']),
            models.Index(fields=['last_updated']),
        ]
    
    def __str__(self):
        return f"Wallet for {self.owner.name} - {self.balance}"


class OwnerWalletTransaction(models.Model):
    """
    Owner wallet transaction history model.
    """
    TRANSACTION_TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
        ('revenue_share', 'Revenue Share'),
        ('withdrawal', 'Withdrawal'),
        ('adjustment', 'Adjustment'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        OwnerWallet,
        on_delete=models.CASCADE,
        related_name='transactions',
        db_index=True
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        db_index=True
    )
    description = models.TextField(blank=True)
    balance_before = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Wallet balance before this transaction"
    )
    balance_after = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Wallet balance after this transaction"
    )
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    created_by = models.ForeignKey(
        'authentication.AdminUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='owner_wallet_transactions_created'
    )
    
    class Meta:
        db_table = 'owner_wallet_transactions'
        verbose_name = 'Owner Wallet Transaction'
        verbose_name_plural = 'Owner Wallet Transactions'
        indexes = [
            models.Index(fields=['wallet']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['transaction_type']),
        ]
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.transaction_type} {self.amount} on {self.wallet.owner.name}'s wallet"


class CompanyWallet(models.Model):
    """
    Company wallet model for Ticket Runners - stores remaining profit after owner distribution.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, default="Ticket Runners Wallet")
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Current company wallet balance (can be negative)"
    )
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'company_wallet'
        verbose_name = 'Company Wallet'
        verbose_name_plural = 'Company Wallets'
        indexes = [
            models.Index(fields=['last_updated']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.balance}"
    
    @classmethod
    def get_or_create_company_wallet(cls):
        """
        Get or create the company wallet (singleton pattern).
        """
        wallet, created = cls.objects.get_or_create(
            name="Ticket Runners Wallet",
            defaults={'balance': 0}
        )
        return wallet


class ProfitDistribution(models.Model):
    """
    Track profit distributions to prevent redistributing the same profit.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    total_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Total TR revenue that was distributed"
    )
    total_distributed = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Total amount distributed to owners"
    )
    remaining_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Amount that went to company wallet"
    )
    distributed_at = models.DateTimeField(default=timezone.now, db_index=True)
    created_by = models.ForeignKey(
        'authentication.AdminUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='profit_distributions_created'
    )
    
    class Meta:
        db_table = 'profit_distributions'
        verbose_name = 'Profit Distribution'
        verbose_name_plural = 'Profit Distributions'
        indexes = [
            models.Index(fields=['distributed_at']),
        ]
        ordering = ['-distributed_at']
    
    def __str__(self):
        return f"Distribution of {self.total_revenue} on {self.distributed_at}"