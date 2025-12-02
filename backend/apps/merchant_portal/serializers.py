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
    customer_profile_image = serializers.SerializerMethodField()
    collector_name = serializers.CharField(source='collector.name', read_only=True)
    collector_mobile = serializers.CharField(source='collector.mobile_number', read_only=True)
    collector_profile_image = serializers.SerializerMethodField()
    
    def get_customer_profile_image(self, obj):
        """Get customer profile image URL."""
        if obj.customer and obj.customer.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.customer.profile_image.url)
            return obj.customer.profile_image.url
        return None
    
    def get_collector_profile_image(self, obj):
        """Get collector profile image URL."""
        if obj.collector and obj.collector.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.collector.profile_image.url)
            return obj.collector.profile_image.url
        return None
    
    class Meta:
        model = NFCCard
        fields = [
            'id', 'serial_number', 'status', 'customer', 'customer_name', 'customer_mobile',
            'customer_profile_image', 'collector', 'collector_name', 'collector_mobile',
            'collector_profile_image', 'merchant', 'assigned_at', 'delivered_at', 'hashed_code',
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

