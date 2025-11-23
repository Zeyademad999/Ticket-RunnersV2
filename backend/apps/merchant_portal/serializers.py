"""
Serializers for Merchant Portal.
"""
from rest_framework import serializers
from users.models import Merchant
from nfc_cards.models import NFCCard
from customers.models import Customer


class MerchantLoginSerializer(serializers.Serializer):
    """Serializer for merchant login."""
    mobile = serializers.CharField(max_length=20, required=True)
    password = serializers.CharField(write_only=True, required=True)


class MerchantOTPSerializer(serializers.Serializer):
    """Serializer for OTP verification."""
    mobile = serializers.CharField(max_length=20, required=True)
    otp_code = serializers.CharField(max_length=6, required=True)


class MerchantProfileSerializer(serializers.ModelSerializer):
    """Serializer for merchant profile."""
    
    class Meta:
        model = Merchant
        fields = [
            'id', 'business_name', 'owner_name', 'email', 'phone', 'mobile_number',
            'address', 'gmaps_location', 'contact_name', 'status',
            'verification_status', 'location', 'business_type', 'registration_date'
        ]
        read_only_fields = ['id', 'registration_date']


class CardAssignmentSerializer(serializers.Serializer):
    """Serializer for card assignment."""
    card_serial = serializers.CharField(max_length=100, required=True)
    customer_mobile = serializers.CharField(max_length=20, required=True)


class CustomerVerificationSerializer(serializers.ModelSerializer):
    """Serializer for customer verification."""
    
    class Meta:
        model = Customer
        fields = ['id', 'name', 'mobile_number', 'email', 'status', 'fees_paid']
        read_only_fields = ['id', 'name', 'mobile_number', 'email', 'status', 'fees_paid']


class CustomerOTPRequestSerializer(serializers.Serializer):
    """Serializer for requesting customer OTP."""
    customer_mobile = serializers.CharField(max_length=20, required=True)


class CardValidationSerializer(serializers.Serializer):
    """Serializer for card validation."""
    card_serial = serializers.CharField(max_length=100, required=True)


class NFCCardSerializer(serializers.ModelSerializer):
    """Serializer for NFC card with merchant fields."""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_mobile = serializers.CharField(source='customer.mobile_number', read_only=True)
    
    class Meta:
        model = NFCCard
        fields = [
            'id', 'serial_number', 'status', 'customer', 'customer_name', 'customer_mobile',
            'merchant', 'assigned_at', 'delivered_at', 'hashed_code',
            'issue_date', 'expiry_date', 'balance', 'last_used', 'usage_count', 'card_type'
        ]
        read_only_fields = ['id', 'issue_date', 'expiry_date', 'balance', 'last_used', 'usage_count']


class MerchantSettingsSerializer(serializers.ModelSerializer):
    """Serializer for merchant settings."""
    
    class Meta:
        model = Merchant
        fields = [
            'business_name', 'owner_name', 'email', 'phone', 'address',
            'gmaps_location', 'contact_name', 'location', 'business_type'
        ]

