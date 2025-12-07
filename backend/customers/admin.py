"""
Admin configuration for customers models.
"""
from django.contrib import admin
from django.contrib import messages
from .models import Customer, Dependent


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'mobile_number', 'phone', 'status', 'fees_paid', 'registration_date', 'is_black_card_customer']
    list_filter = ['status', 'fees_paid', 'is_recurrent', 'registration_date']
    search_fields = ['name', 'email', 'mobile_number', 'phone']
    readonly_fields = ['registration_date', 'created_at', 'updated_at']
    actions = ['set_black_card_customer', 'remove_black_card_customer']
    
    def is_black_card_customer(self, obj):
        """Display if customer is a Black Card Customer."""
        return 'Black Card Customer' in (obj.labels or [])
    is_black_card_customer.boolean = True
    is_black_card_customer.short_description = 'Black Card Customer'
    
    def set_black_card_customer(self, request, queryset):
        """Set selected customers as Black Card Customers."""
        updated = 0
        for customer in queryset:
            labels = customer.labels or []
            if 'Black Card Customer' not in labels:
                labels.append('Black Card Customer')
                customer.labels = labels
                customer.save(update_fields=['labels'])
                updated += 1
        
        self.message_user(
            request,
            f'Successfully set {updated} customer(s) as Black Card Customer(s).',
            messages.SUCCESS
        )
    set_black_card_customer.short_description = 'Set as Black Card Customer'
    
    def remove_black_card_customer(self, request, queryset):
        """Remove Black Card Customer label from selected customers."""
        updated = 0
        for customer in queryset:
            labels = customer.labels or []
            if 'Black Card Customer' in labels:
                labels.remove('Black Card Customer')
                customer.labels = labels
                customer.save(update_fields=['labels'])
                updated += 1
        
        self.message_user(
            request,
            f'Successfully removed Black Card Customer label from {updated} customer(s).',
            messages.SUCCESS
        )
    remove_black_card_customer.short_description = 'Remove Black Card Customer label'


@admin.register(Dependent)
class DependentAdmin(admin.ModelAdmin):
    list_display = ['name', 'customer', 'relationship', 'date_of_birth', 'created_at']
    list_filter = ['relationship', 'created_at']
    search_fields = ['name', 'customer__name']
    readonly_fields = ['created_at', 'updated_at']
