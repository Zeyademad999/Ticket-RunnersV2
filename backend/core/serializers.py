"""
Serializers for core models.
"""
from rest_framework import serializers
from .models import HomePageSection
from events.serializers import EventListSerializer
from events.models import Event


class HomePageSectionSerializer(serializers.ModelSerializer):
    """
    Serializer for HomePageSection model.
    """
    events = EventListSerializer(many=True, read_only=True)
    event_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Event.objects.all(),
        write_only=True,
        required=False,
        source='events'
    )
    event_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = HomePageSection
        fields = [
            'id', 'section_key', 'title', 'subtitle', 'events', 'event_ids',
            'order', 'is_active', 'max_events', 'event_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'event_count']
    
    def to_representation(self, instance):
        """Customize representation to limit events based on max_events."""
        data = super().to_representation(instance)
        if 'events' in data and instance.max_events:
            data['events'] = data['events'][:instance.max_events]
        return data


class HomePageSectionPublicSerializer(serializers.ModelSerializer):
    """
    Public serializer for HomePageSection (used on frontend home page).
    Only includes active sections with limited event data.
    """
    events = EventListSerializer(many=True, read_only=True)
    
    class Meta:
        model = HomePageSection
        fields = [
            'section_key', 'title', 'subtitle', 'events', 'order'
        ]
        read_only_fields = ['section_key', 'title', 'subtitle', 'events', 'order']
    
    def to_representation(self, instance):
        """Limit events based on max_events."""
        data = super().to_representation(instance)
        if 'events' in data and instance.max_events:
            data['events'] = data['events'][:instance.max_events]
        return data

