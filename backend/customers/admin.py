"""
Admin configuration for customers models.
"""
from django.contrib import admin
from .models import Customer, Dependent


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'mobile_number', 'phone', 'status', 'fees_paid', 'registration_date']
    list_filter = ['status', 'fees_paid', 'is_recurrent', 'registration_date']
    search_fields = ['name', 'email', 'mobile_number', 'phone']
    readonly_fields = ['registration_date', 'created_at', 'updated_at']


@admin.register(Dependent)
class DependentAdmin(admin.ModelAdmin):
    list_display = ['name', 'customer', 'relationship', 'date_of_birth', 'created_at']
    list_filter = ['relationship', 'created_at']
    search_fields = ['name', 'customer__name']
    readonly_fields = ['created_at', 'updated_at']
