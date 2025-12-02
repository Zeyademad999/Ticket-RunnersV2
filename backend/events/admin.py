from django.contrib import admin
from django.utils.html import format_html
from .models import Event, EventCategory, TicketCategory


@admin.register(EventCategory)
class EventCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at']


@admin.register(TicketCategory)
class TicketCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'event', 'price', 'total_tickets', 'sold_tickets', 'tickets_available', 'color_display', 'created_at']
    list_filter = ['event', 'created_at']
    search_fields = ['name', 'event__title']
    readonly_fields = ['sold_tickets', 'tickets_available', 'created_at', 'updated_at']
    list_display_links = ['name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('event', 'name', 'price', 'total_tickets')
        }),
        ('Appearance', {
            'fields': ('color',),
            'description': 'Set the color for this ticket category. Use hex color codes (e.g., #10B981 for green, #3B82F6 for blue).'
        }),
        ('Description', {
            'fields': ('description',)
        }),
        ('Statistics', {
            'fields': ('sold_tickets', 'tickets_available'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def color_display(self, obj):
        if obj.color:
            return format_html(
                '<div style="display: flex; align-items: center; gap: 8px;">'
                '<div style="width: 30px; height: 30px; background-color: {}; border-radius: 4px; border: 1px solid #ccc;"></div>'
                '<span>{}</span>'
                '</div>',
                obj.color,
                obj.color
            )
        return '-'
    color_display.short_description = 'Color'


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'organizer', 'venue', 'date', 'time', 'status', 'total_tickets', 'tickets_sold', 'tickets_available']
    list_filter = ['status', 'category', 'date', 'created_at', 'featured']
    search_fields = ['title', 'artist_name', 'description', 'organizer__name', 'venue__name']
    readonly_fields = ['created_at', 'updated_at', 'tickets_sold', 'tickets_available']
    list_display_links = ['id', 'title']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'artist_name', 'organizer', 'venue', 'category', 'status', 'featured')
        }),
        ('Event Images', {
            'description': 'Main image and venue layout image for the event',
            'fields': ('image', 'venue_layout_image')
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
            'fields': ('total_tickets', 'ticket_limit', 'is_ticket_limit_unlimited', 'starting_price', 'ticket_transfer_enabled')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
