"""
Serializers for nfc_cards app.
"""
from rest_framework import serializers
from .models import NFCCard, NFCCardTransaction


class NFCCardSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField(read_only=True)
    customer_id = serializers.SerializerMethodField(read_only=True)
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Override customer field to make it writable
        # Import here to avoid circular dependency
        from customers.models import Customer
        # Override the automatically generated customer field
        self.fields['customer'] = serializers.PrimaryKeyRelatedField(
            queryset=Customer.objects.all(),
            required=False,
            allow_null=True
        )
    
    def get_customer_name(self, obj):
        """Safely get customer name, return None if customer doesn't exist"""
        return obj.customer.name if obj.customer else None
    
    def get_customer_id(self, obj):
        """Safely get customer ID, return None if customer doesn't exist"""
        return str(obj.customer.id) if obj.customer else None
    
    class Meta:
        model = NFCCard
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

