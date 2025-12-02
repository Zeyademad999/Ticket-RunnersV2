"""
Admin configuration for core models.
"""
from django.contrib import admin
from .models import OTP, HomePageSection


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ['phone_number', 'purpose', 'code', 'used', 'expires_at', 'created_at']
    list_filter = ['purpose', 'used', 'expires_at']
    search_fields = ['phone_number']
    readonly_fields = ['created_at']


@admin.register(HomePageSection)
class HomePageSectionAdmin(admin.ModelAdmin):
    list_display = ['section_key', 'title', 'order', 'is_active', 'max_events', 'event_count', 'updated_at']
    list_filter = ['is_active', 'section_key']
    search_fields = ['title', 'subtitle']
    filter_horizontal = ['events']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Section Information', {
            'fields': ('section_key', 'title', 'subtitle', 'order', 'is_active', 'max_events')
        }),
        ('Events', {
            'fields': ('events',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def event_count(self, obj):
        """Display the number of events in this section."""
        return obj.events.count()
    event_count.short_description = 'Event Count'

