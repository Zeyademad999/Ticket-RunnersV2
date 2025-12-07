"""
Users models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator, EmailValidator


class Organizer(models.Model):
    """
    Organizer profile model.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]
    
    user = models.OneToOneField(
        'authentication.AdminUser',
        on_delete=models.CASCADE,
        related_name='organizer_profile',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=200, db_index=True)
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator()],
        db_index=True
    )
    phone = models.CharField(max_length=20)
    contact_mobile = models.CharField(max_length=20, blank=True, null=True, db_index=True, help_text="Mobile number for portal authentication")
    password = models.CharField(max_length=128, blank=True, null=True, help_text="Hashed password for portal authentication")
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    tax_id = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    commercial_registration = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    legal_business_name = models.CharField(max_length=200, blank=True, null=True)
    trade_name = models.CharField(max_length=200, blank=True, null=True)
    about = models.TextField(blank=True, null=True)
    profile_image = models.ImageField(upload_to='organizers/', blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    verified = models.BooleanField(default=False, db_index=True)
    total_events = models.PositiveIntegerField(default=0)
    total_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=0.1000,
        validators=[MinValueValidator(0), MaxValueValidator(1)]
    )
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    registration_date = models.DateTimeField(default=timezone.now, db_index=True)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'organizers'
        verbose_name = 'Organizer'
        verbose_name_plural = 'Organizers'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['contact_mobile']),
            models.Index(fields=['status']),
            models.Index(fields=['verified']),
            models.Index(fields=['tax_id']),
            models.Index(fields=['commercial_registration']),
            models.Index(fields=['registration_date']),
        ]
        ordering = ['-registration_date']
    
    def __str__(self):
        return f"{self.name} ({self.email})"
    
    def set_password(self, raw_password):
        """
        Set password for portal authentication.
        """
        from django.contrib.auth.hashers import make_password
        self.password = make_password(raw_password)
        self.save(update_fields=['password'])
    
    def check_password(self, raw_password):
        """
        Check password for portal authentication.
        """
        from django.contrib.auth.hashers import check_password
        if not self.password:
            return False
        return check_password(raw_password, self.password)


class OrganizerEditRequest(models.Model):
    """
    Model for organizer profile edit requests that require admin approval.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    organizer = models.ForeignKey(
        Organizer,
        on_delete=models.CASCADE,
        related_name='profile_edit_requests',
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    
    # Requested changes (stored as JSON)
    requested_data = models.JSONField(default=dict, help_text="Requested profile changes")
    
    # Profile image file (if included in request)
    profile_image = models.ImageField(upload_to='organizer_requests/', blank=True, null=True)
    
    # Admin who processed the request
    processed_by = models.ForeignKey(
        'authentication.AdminUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_organizer_requests'
    )
    rejection_reason = models.TextField(blank=True, null=True, help_text="Reason for rejection if rejected")
    
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'organizer_edit_requests'
        verbose_name = 'Organizer Edit Request'
        verbose_name_plural = 'Organizer Edit Requests'
        indexes = [
            models.Index(fields=['organizer', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Edit Request for {self.organizer.name} - {self.status}"


class Usher(models.Model):
    """
    Usher profile model.
    """
    ROLE_CHOICES = [
        ('entry', 'Entry'),
        ('exit', 'Exit'),
        ('security', 'Security'),
        ('general', 'General'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('on_leave', 'On Leave'),
    ]
    
    PERFORMANCE_CHOICES = [
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('average', 'Average'),
        ('poor', 'Poor'),
    ]
    
    user = models.OneToOneField(
        'authentication.AdminUser',
        on_delete=models.CASCADE,
        related_name='usher_profile',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=200, db_index=True)
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator()],
        db_index=True
    )
    phone = models.CharField(max_length=20)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='general',
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    location = models.CharField(max_length=200, blank=True, default='')
    experience = models.PositiveIntegerField(default=0)  # in months
    hourly_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )
    total_hours = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    total_events = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    performance = models.CharField(
        max_length=20,
        choices=PERFORMANCE_CHOICES,
        default='average'
    )
    hire_date = models.DateField(default=timezone.now, db_index=True)
    last_active = models.DateTimeField(null=True, blank=True, db_index=True)
    events = models.ManyToManyField(
        'events.Event',
        related_name='ushers',
        blank=True,
        help_text="Events this usher is assigned to"
    )
    zones = models.JSONField(
        default=list,
        blank=True,
        help_text="List of zones this usher can work in (e.g., ['Zone A', 'Zone B'])"
    )
    ticket_categories = models.JSONField(
        default=list,
        blank=True,
        help_text="List of ticket categories this usher can scan (e.g., ['VIP', 'Standard', 'Premium'])"
    )
    is_team_leader = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether this usher is a team leader"
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ushers'
        verbose_name = 'Usher'
        verbose_name_plural = 'Ushers'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['role']),
            models.Index(fields=['email']),
            models.Index(fields=['hire_date']),
        ]
        ordering = ['-hire_date']
    
    def __str__(self):
        return f"{self.name} ({self.role})"


class Merchant(models.Model):
    """
    Merchant profile model.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]
    
    VERIFICATION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]
    
    user = models.OneToOneField(
        'authentication.AdminUser',
        on_delete=models.CASCADE,
        related_name='merchant_profile',
        null=True,
        blank=True
    )
    business_name = models.CharField(max_length=200, db_index=True)
    owner_name = models.CharField(max_length=200)
    email = models.EmailField(
        validators=[EmailValidator()],
        db_index=True
    )
    phone = models.CharField(max_length=20, unique=True, db_index=True)
    mobile_number = models.CharField(max_length=20, blank=True, null=True, db_index=True, help_text="Mobile number for portal authentication")
    password = models.CharField(max_length=128, blank=True, null=True, help_text="Hashed password for portal authentication")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    location = models.CharField(max_length=200)
    address = models.TextField(blank=True, null=True)
    gmaps_location = models.CharField(max_length=500, blank=True, null=True, help_text="Google Maps location URL or coordinates")
    contact_name = models.CharField(max_length=200, blank=True, null=True)
    business_type = models.CharField(max_length=100)
    registration_date = models.DateTimeField(default=timezone.now, db_index=True)
    last_login = models.DateTimeField(null=True, blank=True)
    total_events = models.PositiveIntegerField(default=0)
    total_revenue = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=0.1000,
        validators=[MinValueValidator(0), MaxValueValidator(1)]
    )
    payout_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    tax_id = models.CharField(max_length=50, blank=True)
    bank_account = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'merchants'
        verbose_name = 'Merchant'
        verbose_name_plural = 'Merchants'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['mobile_number']),
            models.Index(fields=['status']),
            models.Index(fields=['verification_status']),
            models.Index(fields=['registration_date']),
        ]
        ordering = ['-registration_date']
    
    def __str__(self):
        return f"{self.business_name} ({self.owner_name})"
    
    def set_password(self, raw_password):
        """
        Set password for portal authentication.
        """
        from django.contrib.auth.hashers import make_password
        self.password = make_password(raw_password)
        self.save(update_fields=['password'])
    
    def check_password(self, raw_password):
        """
        Check password for portal authentication.
        """
        from django.contrib.auth.hashers import check_password
        if not self.password:
            return False
        return check_password(raw_password, self.password)


class MerchantLocation(models.Model):
    """
    Merchant location model for managing multiple physical locations per merchant.
    """
    merchant = models.ForeignKey(
        Merchant,
        on_delete=models.CASCADE,
        related_name='locations',
        db_index=True,
        null=True,
        blank=True,
        help_text="Merchant this location belongs to (optional - can be manual entry)"
    )
    merchant_name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Manual merchant name if not selecting from dropdown"
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Phone number for this location"
    )
    address = models.TextField(
        help_text="Full address of the merchant location"
    )
    google_maps_link = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Google Maps link or embed URL for this location"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this location is active and should be displayed"
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'merchant_locations'
        verbose_name = 'Merchant Location'
        verbose_name_plural = 'Merchant Locations'
        indexes = [
            models.Index(fields=['merchant']),
            models.Index(fields=['is_active']),
        ]
        ordering = ['merchant', 'address']
    
    def __str__(self):
        merchant_display = self.merchant.business_name if self.merchant else (self.merchant_name or 'Unknown')
        return f"{merchant_display} - {self.address[:50]}"
    
    @property
    def display_name(self):
        """Get display name for the merchant."""
        if self.merchant:
            return self.merchant.business_name
        return self.merchant_name or 'Unknown Merchant'
