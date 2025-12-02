"""
Admin configuration for webapp models.
"""
from django.contrib import admin
from .models import Favorite


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['customer', 'event', 'created_at']
    list_filter = ['created_at']
    search_fields = ['customer__name', 'event__title']
    readonly_fields = ['created_at']
