"""
Admin configuration for payments models.
"""
from django.contrib import admin
from .models import PaymentTransaction


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_id', 'customer', 'amount', 'payment_method', 'status', 'created_at']
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['transaction_id', 'customer__name', 'customer__email']
    readonly_fields = ['id', 'transaction_id', 'created_at', 'updated_at']

