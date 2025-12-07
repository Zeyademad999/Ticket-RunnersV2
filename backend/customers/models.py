"""
Customers models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import EmailValidator
from django.contrib.auth.hashers import make_password, check_password


class Customer(models.Model):
    """
    Customer profile model.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('banned', 'Banned'),
    ]
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]
    
    user = models.OneToOneField(
        'authentication.AdminUser',
        on_delete=models.CASCADE,
        related_name='customer_profile',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=200, db_index=True)
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator()],
        db_index=True
    )
    phone = models.CharField(max_length=20, db_index=True)
    mobile_number = models.CharField(max_length=20, blank=True, null=True, db_index=True, help_text="Mobile number for webapp authentication")
    national_id = models.CharField(max_length=50, unique=True, null=True, blank=True, db_index=True, help_text="National ID number (optional for registration)")
    nationality = models.CharField(max_length=100, blank=True, null=True, help_text="Customer nationality")
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, null=True, help_text="Gender identity")
    date_of_birth = models.DateField(blank=True, null=True, help_text="Date of birth")
    password = models.CharField(max_length=128, blank=True, null=True, help_text="Hashed password for webapp authentication")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    registration_date = models.DateTimeField(default=timezone.now, db_index=True)
    last_login = models.DateTimeField(null=True, blank=True)
    total_bookings = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    attended_events = models.PositiveIntegerField(default=0)
    is_recurrent = models.BooleanField(default=False, db_index=True)
    fees_paid = models.BooleanField(default=False, db_index=True, help_text="Whether customer has paid registration fees")
    emergency_contact_name = models.CharField(max_length=200, blank=True, null=True, help_text="Emergency contact person name")
    emergency_contact_mobile = models.CharField(max_length=20, blank=True, null=True, help_text="Emergency contact mobile number")
    blood_type = models.CharField(max_length=10, blank=True, null=True, help_text="Blood type (e.g., A+, B-, O+, AB+)")
    profile_image = models.ImageField(upload_to='customer_profiles/', blank=True, null=True, help_text="Customer profile image")
    notes = models.TextField(blank=True, null=True, help_text="Notes from EVS (Event Verification System) or other sources")
    labels = models.JSONField(default=list, blank=True, help_text="Custom labels assigned by admin (e.g., ['VIP', 'Premium'])")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customers'
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
        indexes = [
        models.Index(fields=['email']),
        models.Index(fields=['phone']),
        models.Index(fields=['mobile_number']),
        models.Index(fields=['national_id']),
        models.Index(fields=['status']),
        models.Index(fields=['is_recurrent']),
        models.Index(fields=['registration_date']),
        ]
        ordering = ['-registration_date']
    
    def __str__(self):
        return f"{self.name} ({self.email})"
    
    def calculate_total_spent(self):
        """
        Calculate total amount spent by customer.
        """
        from tickets.models import Ticket
        total = Ticket.objects.filter(
            customer=self,
            status__in=['valid', 'used']
        ).aggregate(
            total=models.Sum('price')
        )['total'] or 0
        
        self.total_spent = total
        self.save(update_fields=['total_spent'])
        return total
    
    def mark_recurrent(self):
        """
        Mark customer as recurrent if they have attended multiple events.
        """
        if self.attended_events >= 3:
            self.is_recurrent = True
            self.save(update_fields=['is_recurrent'])
            return True
        return False
    
    def set_password(self, raw_password):
        """
        Set password for webapp authentication.
        """
        self.password = make_password(raw_password)
        self.save(update_fields=['password'])
    
    def check_password(self, raw_password):
        """
        Check password for webapp authentication.
        """
        if not self.password:
            return False
        return check_password(raw_password, self.password)
    
    def calculate_age(self):
        """
        Calculate age from date of birth.
        Returns None if date_of_birth is not set.
        """
        if not self.date_of_birth:
            return None
        
        from datetime import date
        today = date.today()
        age = today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
        return age
    
    @property
    def age(self):
        """
        Property to get current age.
        """
        return self.calculate_age()


class Dependent(models.Model):
    """
    Dependent (family member) model for customers.
    """
    RELATIONSHIP_CHOICES = [
        ('spouse', 'Spouse'),
        ('child', 'Child'),
        ('parent', 'Parent'),
        ('sibling', 'Sibling'),
        ('other', 'Other'),
    ]
    
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='dependents',
        db_index=True
    )
    name = models.CharField(max_length=200, db_index=True)
    date_of_birth = models.DateField(null=True, blank=True)
    relationship = models.CharField(
        max_length=20,
        choices=RELATIONSHIP_CHOICES,
        default='other'
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'dependents'
        verbose_name = 'Dependent'
        verbose_name_plural = 'Dependents'
        indexes = [
            models.Index(fields=['customer']),
            models.Index(fields=['name']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.relationship}) - {self.customer.name}"
