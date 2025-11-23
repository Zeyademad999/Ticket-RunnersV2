"""
Admin configuration for authentication app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import AdminUser


@admin.register(AdminUser)
class AdminUserAdmin(BaseUserAdmin):
    """
    Admin interface for AdminUser model.
    """
    list_display = ['username', 'email', 'role', 'is_active', 'last_login', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff', 'created_at']
    search_fields = ['username', 'email']
    ordering = ['-created_at']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role Information', {'fields': ('role',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login', 'date_joined']
