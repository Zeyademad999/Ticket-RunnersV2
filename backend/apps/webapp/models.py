"""
WebApp models for TicketRunners User-Facing WebApp.
"""
from django.db import models
from django.utils import timezone


class Favorite(models.Model):
    """
    Favorite events model for users.
    """
    customer = models.ForeignKey(
        'customers.Customer',
        on_delete=models.CASCADE,
        related_name='favorites',
        db_index=True
    )
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='favorited_by',
        db_index=True
    )
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        db_table = 'favorites'
        verbose_name = 'Favorite'
        verbose_name_plural = 'Favorites'
        unique_together = [['customer', 'event']]
        indexes = [
            models.Index(fields=['customer']),
            models.Index(fields=['event']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.customer.name} favorited {self.event.title}"
