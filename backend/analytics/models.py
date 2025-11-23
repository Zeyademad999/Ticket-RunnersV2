"""
Analytics models for TicketRunners Admin Dashboard.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator


class DashboardStats(models.Model):
    """
    Cached dashboard statistics model.
    Note: Using individual fields instead of JSONField for MySQL compatibility.
    """
    date = models.DateField(default=timezone.now, unique=True, db_index=True)
    
    # Event Analytics
    total_events = models.PositiveIntegerField(default=0)
    total_tickets_sold = models.PositiveIntegerField(default=0)
    total_tickets_available = models.PositiveIntegerField(default=0)
    total_attendees = models.PositiveIntegerField(default=0)
    
    # Financial Summary
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cut_commissions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pending_payouts = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    completed_payouts = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    card_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # User Summary
    total_visitors = models.PositiveIntegerField(default=0)
    registered_users = models.PositiveIntegerField(default=0)
    active_users = models.PositiveIntegerField(default=0)
    inactive_users = models.PositiveIntegerField(default=0)
    recurrent_users = models.PositiveIntegerField(default=0)
    
    # Card Summary
    total_cards = models.PositiveIntegerField(default=0)
    active_cards = models.PositiveIntegerField(default=0)
    inactive_cards = models.PositiveIntegerField(default=0)
    expired_cards = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'dashboard_stats'
        verbose_name = 'Dashboard Statistics'
        verbose_name_plural = 'Dashboard Statistics'
        indexes = [
            models.Index(fields=['date']),
        ]
        ordering = ['-date']
    
    def __str__(self):
        return f"Dashboard Stats for {self.date}"
