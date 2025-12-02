from django.contrib import admin
from .models import PartTimeLeave, ScanReport


@admin.register(PartTimeLeave)
class PartTimeLeaveAdmin(admin.ModelAdmin):
    list_display = ['usher', 'event', 'leave_time', 'return_time', 'created_at']
    list_filter = ['leave_time', 'created_at']
    search_fields = ['usher__username', 'event__title']
    readonly_fields = ['created_at']


@admin.register(ScanReport)
class ScanReportAdmin(admin.ModelAdmin):
    list_display = ['usher', 'event', 'report_type', 'status', 'created_at']
    list_filter = ['report_type', 'status', 'created_at']
    search_fields = ['usher__username', 'event__title', 'description', 'card_id']
    readonly_fields = ['created_at', 'updated_at']

