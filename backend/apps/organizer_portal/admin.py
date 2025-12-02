"""
Admin configuration for organizer portal models.
"""
from django.contrib import admin
from .models import EventEditRequest


@admin.register(EventEditRequest)
class EventEditRequestAdmin(admin.ModelAdmin):
    list_display = ['event', 'organizer', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['event__title', 'organizer__name']
    readonly_fields = ['created_at', 'updated_at']
