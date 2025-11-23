"""
Usher Portal models for TicketRunners platform.
"""
from django.db import models
from django.utils import timezone


class PartTimeLeave(models.Model):
    """
    Part-time leave tracking for ushers.
    """
    usher = models.ForeignKey(
        'users.Usher',
        on_delete=models.CASCADE,
        related_name='part_time_leaves',
        db_index=True
    )
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='usher_leaves',
        db_index=True
    )
    leave_time = models.DateTimeField(default=timezone.now, db_index=True)
    return_time = models.DateTimeField(null=True, blank=True)
    reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        db_table = 'usher_part_time_leaves'
        verbose_name = 'Part Time Leave'
        verbose_name_plural = 'Part Time Leaves'
        indexes = [
            models.Index(fields=['usher']),
            models.Index(fields=['event']),
            models.Index(fields=['leave_time']),
        ]
        ordering = ['-leave_time']
    
    def __str__(self):
        usher_name = self.usher.name if hasattr(self.usher, 'name') and self.usher.name else str(self.usher.id)
        event_title = self.event.title if hasattr(self.event, 'title') and self.event.title else str(self.event.id)
        return f"Leave for {usher_name} at {event_title}"


class ScanReport(models.Model):
    """
    Scan issue/incident reporting for ushers.
    """
    REPORT_TYPE_CHOICES = [
        ('technical', 'Technical Issue'),
        ('security', 'Security Concern'),
        ('customer', 'Customer Issue'),
        ('other', 'Other'),
    ]
    
    usher = models.ForeignKey(
        'users.Usher',
        on_delete=models.CASCADE,
        related_name='scan_reports',
        db_index=True
    )
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='scan_reports',
        db_index=True
    )
    report_type = models.CharField(
        max_length=20,
        choices=REPORT_TYPE_CHOICES,
        default='other',
        db_index=True
    )
    description = models.TextField()
    card_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    ticket_id = models.UUIDField(null=True, blank=True, db_index=True)
    customer_id = models.UUIDField(null=True, blank=True, db_index=True)
    status = models.CharField(
        max_length=20,
        default='pending',
        db_index=True
    )
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'usher_scan_reports'
        verbose_name = 'Scan Report'
        verbose_name_plural = 'Scan Reports'
        indexes = [
            models.Index(fields=['usher']),
            models.Index(fields=['event']),
            models.Index(fields=['report_type']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Report by {self.usher.username} - {self.report_type}"

