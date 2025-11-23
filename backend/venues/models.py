"""
Venues models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator


class Venue(models.Model):
    """
    Venue model.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Maintenance'),
    ]
    
    name = models.CharField(max_length=200, db_index=True)
    address = models.TextField()
    city = models.CharField(max_length=100, db_index=True)
    capacity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
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
        db_table = 'venues'
        verbose_name = 'Venue'
        verbose_name_plural = 'Venues'
        indexes = [
            models.Index(fields=['city']),
            models.Index(fields=['status']),
            models.Index(fields=['name']),
        ]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} - {self.city}"
