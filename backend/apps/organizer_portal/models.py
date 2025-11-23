"""
Organizer Portal models for TicketRunners platform.
"""
from django.db import models
from django.utils import timezone


class EventEditRequest(models.Model):
    """
    Event edit request model for organizers to request changes to events.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.CASCADE,
        related_name='edit_requests',
        db_index=True
    )
    organizer = models.ForeignKey(
        'users.Organizer',
        on_delete=models.CASCADE,
        related_name='edit_requests',
        db_index=True
    )
    requested_changes = models.TextField(help_text="Description of requested changes")
    file_attachments = models.TextField(blank=True, null=True, help_text="JSON serialized list of file paths/URLs")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    admin_notes = models.TextField(blank=True, null=True, help_text="Admin notes/reason for approval/rejection")
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'event_edit_requests'
        verbose_name = 'Event Edit Request'
        verbose_name_plural = 'Event Edit Requests'
        indexes = [
            models.Index(fields=['event']),
            models.Index(fields=['organizer']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Edit request for {self.event.title} by {self.organizer.name} ({self.status})"
