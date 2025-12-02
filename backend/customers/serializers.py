"""
Serializers for customers app.
"""
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import Customer


def normalize_mobile_number(mobile_number: str) -> str:
    """
    Normalize mobile number to handle different formats.
    Converts Egyptian numbers from 01104484492 to +201104484492 format.
    """
    if not mobile_number:
        return mobile_number
    
    # Remove any whitespace
    mobile_number = mobile_number.strip()
    
    # If it starts with +20, return as is
    if mobile_number.startswith('+20'):
        return mobile_number
    
    # If it starts with 20 (without +), add +
    if mobile_number.startswith('20') and len(mobile_number) >= 12:
        return '+' + mobile_number
    
    # If it starts with 0 (Egyptian local format), replace 0 with +20
    if mobile_number.startswith('0') and len(mobile_number) == 11:
        return '+20' + mobile_number[1:]
    
    # If it's 10 digits starting with 1 (Egyptian mobile without leading 0)
    if mobile_number.startswith('1') and len(mobile_number) == 10:
        return '+20' + mobile_number
    
    # Return as is if no pattern matches
    return mobile_number


class CustomerSerializer(serializers.ModelSerializer):
    profile_image = serializers.ImageField(
        required=False, allow_null=True, use_url=True
    )
    nfc_card_serial = serializers.SerializerMethodField()
    fees_paid = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_nfc_card_serial(self, obj):
        """Get the serial number of the customer's active NFC card."""
        active_card = obj.nfc_cards.filter(status='active').first()
        if active_card:
            return active_card.serial_number
        return None
    
    def get_fees_paid(self, obj):
        """Determine if customer has paid fees - either explicitly set or has active NFC card."""
        # If fees_paid is explicitly True, return True
        if obj.fees_paid:
            return True
        # If customer has an active NFC card, they have paid fees
        if obj.nfc_cards.filter(status='active').exists():
            return True
        # Otherwise return the stored value
        return obj.fees_paid
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        profile_image = data.get('profile_image')
        request = self.context.get('request')
        if profile_image and request:
            data['profile_image'] = request.build_absolute_uri(profile_image)
        # Ensure fees_paid uses the computed value
        data['fees_paid'] = self.get_fees_paid(instance)
        return data
    
    def create(self, validated_data):
        # Password is required for webapp login
        if 'password' not in validated_data or not validated_data.get('password'):
            raise serializers.ValidationError({'password': 'Password is required for customer to login to webapp.'})
        
        # Hash password
        validated_data['password'] = make_password(validated_data['password'])
        
        # Normalize and set mobile_number from phone if mobile_number is not provided
        phone = validated_data.get('phone')
        mobile_number = validated_data.get('mobile_number')
        
        # Ensure mobile_number is set from phone if not provided
        if phone:
            # Normalize phone field
            validated_data['phone'] = normalize_mobile_number(phone)
            
            # Set mobile_number from phone if not provided or empty
            if not mobile_number or (isinstance(mobile_number, str) and mobile_number.strip() == ''):
                validated_data['mobile_number'] = validated_data['phone']
            else:
                # Normalize mobile_number if provided
                validated_data['mobile_number'] = normalize_mobile_number(mobile_number)
        elif mobile_number:
            # Normalize mobile_number if provided but no phone
            validated_data['mobile_number'] = normalize_mobile_number(mobile_number)
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Hash password if provided
        if 'password' in validated_data and validated_data['password']:
            validated_data['password'] = make_password(validated_data['password'])
        
        # Normalize and set mobile_number from phone if mobile_number is not provided
        phone = validated_data.get('phone')
        mobile_number = validated_data.get('mobile_number')
        
        if phone and not mobile_number:
            # Normalize phone number and set as mobile_number
            validated_data['mobile_number'] = normalize_mobile_number(phone)
        elif mobile_number:
            # Normalize mobile_number if provided
            validated_data['mobile_number'] = normalize_mobile_number(mobile_number)
        
        # Also normalize phone field
        if phone:
            validated_data['phone'] = normalize_mobile_number(phone)
        
        return super().update(instance, validated_data)

