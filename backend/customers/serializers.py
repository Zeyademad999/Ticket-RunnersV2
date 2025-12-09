"""
Serializers for customers app.
"""
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import Customer
import re


def normalize_mobile_number(mobile_number: str) -> str:
    """
    Normalize mobile number to handle different formats.
    Converts Egyptian numbers from 01104484492 to +201104484492 format.
    """
    if not mobile_number:
        return mobile_number
    
    # Remove any whitespace
    mobile_number = mobile_number.strip()
    
    # Remove all non-digit characters for processing
    digits_only = re.sub(r'\D', '', mobile_number)
    
    # Handle case where there's an extra 0 after country code: +2001... or 2001...
    # This happens when user inputs 01012900990 with +20, resulting in +2001012900990
    if digits_only.startswith('2001') and len(digits_only) == 13:
        # Remove the extra 0: 2001104484492 -> 201104484492
        return '+20' + digits_only[3:]
    
    # If it starts with +20, check for extra 0
    if mobile_number.startswith('+20'):
        if len(digits_only) == 13 and digits_only[2] == '0':
            # Remove the extra 0: +2001104484492 -> +201104484492
            return '+20' + digits_only[3:]
        return mobile_number
    
    # If it starts with 20 (without +), add + and check for extra 0
    if digits_only.startswith('20') and len(digits_only) >= 12:
        if len(digits_only) == 13 and digits_only[2] == '0':
            # Remove the extra 0: 2001104484492 -> +201104484492
            return '+20' + digits_only[3:]
        return '+' + digits_only
    
    # If it starts with 0 (Egyptian local format), replace 0 with +20
    if digits_only.startswith('0') and len(digits_only) == 11:
        return '+20' + digits_only[1:]
    
    # If it's 10 digits starting with 1 (Egyptian mobile without leading 0)
    if digits_only.startswith('1') and len(digits_only) == 10:
        return '+20' + digits_only
    
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
        # Ensure labels are returned as objects with name, color, icon, description
        if 'labels' in data and isinstance(data['labels'], list):
            transformed_labels = []
            for label_data in data['labels']:
                if isinstance(label_data, dict) and 'name' in label_data:
                    # Already an object, ensure all fields are present
                    transformed_labels.append({
                        'name': label_data.get('name'),
                        'color': label_data.get('color', '#3B82F6'), # Default color
                        'icon': label_data.get('icon', 'Tag'), # Default icon
                        'description': label_data.get('description', label_data.get('name')),
                    })
                elif isinstance(label_data, str):
                    # Convert string label to object with default color/icon
                    label_name = label_data
                    label_colors = {
                        'VIP': '#F59E0B', 'Premium': '#8B5CF6', 'Regular': '#3B82F6',
                        'Student': '#06B6D4', 'Early Bird': '#10B981', 'Black Card Customer': '#000000',
                    }
                    label_icons = {
                        'VIP': 'Crown', 'Premium': 'Award', 'Regular': 'Tag',
                        'Student': 'Shield', 'Early Bird': 'Star', 'Black Card Customer': 'CreditCard',
                    }
                    transformed_labels.append({
                        'name': label_name,
                        'color': label_colors.get(label_name, '#3B82F6'),
                        'icon': label_icons.get(label_name, 'Tag'),
                        'description': label_name,
                    })
            data['labels'] = transformed_labels
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
        
        # Ensure labels is always a list (handle None, empty string, etc.)
        # Labels can be either array of strings (legacy) or array of objects with name, color, icon
        if 'labels' in validated_data:
            labels = validated_data['labels']
            if labels is None:
                validated_data['labels'] = []
            elif isinstance(labels, str):
                # If it's a string, try to parse as JSON, otherwise make it a list
                import json
                try:
                    parsed = json.loads(labels)
                    validated_data['labels'] = parsed if isinstance(parsed, list) else [parsed] if parsed else []
                except (json.JSONDecodeError, TypeError):
                    validated_data['labels'] = [labels] if labels.strip() else []
            elif isinstance(labels, list):
                # Normalize labels - convert strings to objects, ensure objects have required fields
                normalized_labels = []
                for label in labels:
                    if isinstance(label, str):
                        # Legacy format: just a string, convert to object
                        normalized_labels.append({
                            'name': label,
                            'color': '#3B82F6',  # Default color
                            'icon': 'Tag',  # Default icon
                        })
                    elif isinstance(label, dict):
                        # New format: object with name, color, icon
                        normalized_labels.append({
                            'name': label.get('name', ''),
                            'color': label.get('color', '#3B82F6'),
                            'icon': label.get('icon', 'Tag'),
                            'description': label.get('description', label.get('name', '')),
                        })
                validated_data['labels'] = normalized_labels
            else:
                validated_data['labels'] = []
        
        return super().update(instance, validated_data)

