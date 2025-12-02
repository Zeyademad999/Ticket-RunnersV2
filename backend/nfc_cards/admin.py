"""
Admin configuration for NFC cards models.
"""
from django.contrib import admin
from .models import NFCCard, NFCCardTransaction, NFCCardAutoReload


@admin.register(NFCCard)
class NFCCardAdmin(admin.ModelAdmin):
    list_display = ['serial_number', 'customer', 'merchant', 'status', 'balance', 'assigned_at', 'delivered_at']
    list_filter = ['status', 'card_type', 'assigned_at', 'delivered_at']
    search_fields = ['serial_number', 'customer__name', 'customer__mobile_number']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(NFCCardTransaction)
class NFCCardTransactionAdmin(admin.ModelAdmin):
    list_display = ['card', 'amount', 'transaction_type', 'timestamp']
    list_filter = ['transaction_type', 'timestamp']
    search_fields = ['card__serial_number']
    readonly_fields = ['timestamp']


@admin.register(NFCCardAutoReload)
class NFCCardAutoReloadAdmin(admin.ModelAdmin):
    list_display = ['nfc_card', 'threshold_amount', 'reload_amount', 'enabled', 'created_at']
    list_filter = ['enabled', 'created_at']
    search_fields = ['nfc_card__serial_number']
    readonly_fields = ['created_at', 'updated_at']
