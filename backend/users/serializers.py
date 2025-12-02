"""
Serializers for users app.
"""
from rest_framework import serializers
from .models import Organizer, Usher, Merchant, MerchantLocation
from authentication.models import AdminUser


class OrganizerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organizer
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class UsherSerializer(serializers.ModelSerializer):
    location = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    
    class Meta:
        model = Usher
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'events': {'required': False}
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from events.models import Event
        from datetime import datetime, date
        
        # Override the events field (ManyToMany) with PrimaryKeyRelatedField for write operations
        if 'events' in self.fields:
            self.fields['events'] = serializers.PrimaryKeyRelatedField(
                many=True,
                queryset=Event.objects.all(),
                required=False,
                allow_empty=True
            )
        
        # Override hire_date to handle datetime conversion
        if 'hire_date' in self.fields:
            self.fields['hire_date'] = serializers.SerializerMethodField()
    
    def get_hire_date(self, obj):
        """Handle hire_date conversion from datetime to date"""
        if obj.hire_date:
            from datetime import datetime, date
            if isinstance(obj.hire_date, datetime):
                return obj.hire_date.date().isoformat()
            elif isinstance(obj.hire_date, date):
                return obj.hire_date.isoformat()
        return None
    
    def to_representation(self, instance):
        """Override to include event details in read operations"""
        representation = super().to_representation(instance)
        # Replace event IDs with event details
        if 'events' in representation and instance.pk:
            representation['events'] = [
                {
                    'id': str(event.id),
                    'title': event.title,
                    'date': event.date.isoformat() if event.date else None,
                    'status': event.status,
                    'venue': event.venue.name if event.venue else None,
                    'organizer': event.organizer.name if event.organizer else None,
                    'category': event.category.name if event.category else None,
                }
                for event in instance.events.all()
            ]
        return representation
    
    def validate_location(self, value):
        """Ensure location is not None"""
        return value or ''
    
    def validate(self, data):
        """Validate the entire serializer data"""
        # Ensure location is not None
        if 'location' in data and data['location'] is None:
            data['location'] = ''
        return data
    
    def create(self, validated_data):
        events = validated_data.pop('events', [])
        usher = super().create(validated_data)
        if events:
            usher.events.set(events)
        return usher
    
    def update(self, instance, validated_data):
        events = validated_data.pop('events', None)
        usher = super().update(instance, validated_data)
        if events is not None:
            usher.events.set(events)
        return usher


class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class MerchantLocationSerializer(serializers.ModelSerializer):
    merchant_name_display = serializers.CharField(source='display_name', read_only=True)
    
    class Meta:
        model = MerchantLocation
        fields = [
            'id', 'merchant', 'merchant_name', 'merchant_name_display',
            'phone_number', 'address', 'google_maps_link', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminUser
        fields = ['id', 'username', 'email', 'role', 'is_active', 'last_login', 'created_at']
        read_only_fields = ['id', 'created_at']

