"""
Core models for TicketRunners platform.
"""
from django.db import models
from django.utils import timezone
from datetime import timedelta


class OTP(models.Model):
    """
    OTP (One-Time Password) model for authentication and verification.
    Used by Organizer, Merchant, and WebApp portals.
    """
    PURPOSE_CHOICES = [
        ('login', 'Login'),
        ('forgot_password', 'Forgot Password'),
        ('customer_verification', 'Customer Verification'),
        ('mobile_change', 'Mobile Change'),
        ('registration', 'Registration'),
    ]
    
    phone_number = models.CharField(max_length=20, db_index=True)
    code = models.CharField(max_length=6)
    purpose = models.CharField(
        max_length=50,
        choices=PURPOSE_CHOICES,
        db_index=True
    )
    expires_at = models.DateTimeField(db_index=True)
    used = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'otps'
        verbose_name = 'OTP'
        verbose_name_plural = 'OTPs'
        indexes = [
            models.Index(fields=['phone_number', 'purpose', 'used']),
            models.Index(fields=['phone_number', 'code', 'used']),
            models.Index(fields=['expires_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"OTP for {self.phone_number} - {self.purpose}"
    
    def is_expired(self):
        """Check if OTP has expired."""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Check if OTP is valid (not used and not expired)."""
        return not self.used and not self.is_expired()


class HomePageSection(models.Model):
    """
    Model for managing home page sections (Trending Events, Upcoming Events, etc.).
    Allows admins to configure which events appear in which sections.
    """
    SECTION_KEY_CHOICES = [
        ('trending', 'Trending Events'),
        ('upcoming', 'Upcoming Events'),
        ('recommended', 'Recommended Events'),
        ('featured', 'Featured Event'),
    ]
    
    section_key = models.CharField(
        max_length=50,
        choices=SECTION_KEY_CHOICES,
        unique=True,
        db_index=True,
        help_text="Unique identifier for the section"
    )
    title = models.CharField(
        max_length=200,
        help_text="Section title displayed on the home page"
    )
    subtitle = models.CharField(
        max_length=300,
        blank=True,
        help_text="Section subtitle/description"
    )
    events = models.ManyToManyField(
        'events.Event',
        related_name='home_page_sections',
        blank=True,
        help_text="Events to display in this section"
    )
    order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text="Display order on the home page (lower numbers appear first)"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this section is visible on the home page"
    )
    max_events = models.PositiveIntegerField(
        default=10,
        help_text="Maximum number of events to display in this section"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'home_page_sections'
        verbose_name = 'Home Page Section'
        verbose_name_plural = 'Home Page Sections'
        ordering = ['order', 'section_key']
        indexes = [
            models.Index(fields=['section_key', 'is_active']),
            models.Index(fields=['order', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.get_section_key_display()} - {self.title}"
