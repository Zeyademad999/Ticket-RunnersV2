"""
Authentication models for TicketRunners Admin Dashboard.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class AdminUser(AbstractUser):
    """
    Custom user model for admin users.
    All admin users are just admins, no roles. Permissions are stored as JSON array.
    """
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Admin'),
        ('ADMIN', 'Admin'),
        ('SUPPORT', 'Support'),
        ('USHER', 'Usher'),
    ]
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='ADMIN',
        db_index=True
    )
    permissions = models.JSONField(
        default=list,
        blank=True,
        help_text="List of permission strings that this admin user has access to"
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'admin_users'
        verbose_name = 'Admin User'
        verbose_name_plural = 'Admin Users'
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['email']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.username} (Admin)"
    
    def has_permission(self, permission_name):
        """
        Check if user has a specific permission.
        Super admins have all permissions. Other admins check their permissions list.
        """
        if self.role == 'SUPER_ADMIN' or self.is_superuser:
            return True
        
        # Check if permission is in the user's permissions list
        if isinstance(self.permissions, list):
            return permission_name in self.permissions
        
        return False
    
    def get_role_display(self):
        """
        Get human-readable role name.
        """
        return dict(self.ROLE_CHOICES).get(self.role, self.role)
