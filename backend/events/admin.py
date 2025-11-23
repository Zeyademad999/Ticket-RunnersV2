from django.contrib import admin
from .models import Event, EventCategory


@admin.register(EventCategory)
class EventCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'organizer', 'venue', 'date', 'time', 'status', 'total_tickets', 'tickets_sold', 'tickets_available']
    list_filter = ['status', 'category', 'date', 'created_at', 'featured']
    search_fields = ['title', 'description', 'organizer__name', 'venue__name']
    readonly_fields = ['created_at', 'updated_at', 'tickets_sold', 'tickets_available']
    list_display_links = ['id', 'title']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'organizer', 'venue', 'category', 'status', 'featured')
        }),
        ('Event Image', {
            'description': 'Main image for the event - displayed on event detail page and listings',
            'fields': ('image',)
        }),
        ('About This Event', {
            'description': 'Detailed description about the event',
            'fields': ('description',)
        }),
        ('Date & Time', {
            'description': 'Event date, start time, and gates open time',
            'fields': ('date', 'time', 'gates_open_time')
        }),
        ('About The Venue', {
            'description': 'Information about the venue',
            'fields': ('about_venue',)
        }),
        ('Event Terms and Conditions', {
            'description': 'Terms and conditions for this event',
            'fields': ('terms_and_conditions',)
        }),
        ('Tickets & Pricing', {
            'description': 'Ticket configuration and pricing',
            'fields': ('total_tickets', 'ticket_limit', 'starting_price', 'ticket_transfer_enabled')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
