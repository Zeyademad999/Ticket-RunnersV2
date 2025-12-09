"""
Serializers for NFC cards app.
"""
from rest_framework import serializers
from .models import NFCCard, NFCCardSettings, NFCCardTransaction, NFCCardAutoReload


class NFCCardSerializer(serializers.ModelSerializer):
    """Serializer for NFC Card model."""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_mobile = serializers.CharField(source='customer.mobile_number', read_only=True)
    collector_name = serializers.CharField(source='collector.name', read_only=True)
    collector_mobile = serializers.CharField(source='collector.mobile_number', read_only=True)
    
    class Meta:
        model = NFCCard
        fields = [
            'id', 'serial_number', 'status', 'customer', 'customer_name', 'customer_mobile',
            'collector', 'collector_name', 'collector_mobile', 'merchant', 'assigned_at',
            'delivered_at', 'hashed_code', 'issue_date', 'expiry_date', 'balance',
            'last_used', 'usage_count', 'card_type', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Override create to set issue_date if not provided"""
        from django.utils import timezone
        
        # Set issue_date to today if not provided
        if 'issue_date' not in validated_data or validated_data.get('issue_date') is None:
            validated_data['issue_date'] = timezone.now().date()
        
        return super().create(validated_data)


class NFCCardSettingsSerializer(serializers.ModelSerializer):
    """Serializer for NFC Card Settings model."""
    
    class Meta:
        model = NFCCardSettings
        fields = [
            'id', 'first_purchase_cost', 'renewal_fee', 'deactivation_days_before_expiry',
            'auto_deactivate_expired', 'card_validity_days', 'updated_at', 'updated_by'
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by']


class NFCCardTransactionSerializer(serializers.ModelSerializer):
    """Serializer for NFC Card Transaction model."""
    
    class Meta:
        model = NFCCardTransaction
        fields = [
            'id', 'nfc_card', 'transaction_type', 'amount', 'balance_before',
            'balance_after', 'description', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class NFCCardAutoReloadSerializer(serializers.ModelSerializer):
    """Serializer for NFC Card Auto Reload model."""
    
    class Meta:
        model = NFCCardAutoReload
        fields = [
            'id', 'nfc_card', 'threshold_amount', 'reload_amount', 'enabled',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
