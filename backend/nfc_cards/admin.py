"""
Admin configuration for NFC cards models.
"""
from django.contrib import admin
from .models import NFCCard, NFCCardTransaction, NFCCardAutoReload, NFCCardSettings


@admin.register(NFCCard)
class NFCCardAdmin(admin.ModelAdmin):
    list_display = ['serial_number', 'customer', 'merchant', 'status', 'balance', 'assigned_at', 'delivered_at']
    list_filter = ['status', 'card_type', 'assigned_at', 'delivered_at']
    search_fields = ['serial_number', 'customer__name', 'customer__mobile_number']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(NFCCardTransaction)
class NFCCardTransactionAdmin(admin.ModelAdmin):
    list_display = ['nfc_card', 'amount', 'transaction_type', 'created_at']
    list_filter = ['transaction_type', 'created_at']
    search_fields = ['nfc_card__serial_number']
    readonly_fields = ['id', 'created_at']


@admin.register(NFCCardAutoReload)
class NFCCardAutoReloadAdmin(admin.ModelAdmin):
    list_display = ['nfc_card', 'threshold_amount', 'reload_amount', 'enabled', 'created_at']
    list_filter = ['enabled', 'created_at']
    search_fields = ['nfc_card__serial_number']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(NFCCardSettings)
class NFCCardSettingsAdmin(admin.ModelAdmin):
    list_display = ['first_purchase_cost', 'renewal_fee', 'deactivation_days_before_expiry', 'auto_deactivate_expired', 'card_validity_days', 'updated_at']
    readonly_fields = ['updated_at']
    
    def has_add_permission(self, request):
        # Only allow one settings instance
        return not NFCCardSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion of settings
        return False
