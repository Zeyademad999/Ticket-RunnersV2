"""
Serializers for Usher Portal.
"""
from rest_framework import serializers
from django.db.models import Q
from users.models import Usher
from events.models import Event
from tickets.models import Ticket
from nfc_cards.models import NFCCard
from customers.models import Customer, Dependent
from system.models import CheckinLog
from apps.usher_portal.models import PartTimeLeave, ScanReport


class UsherLoginSerializer(serializers.Serializer):
    """Serializer for usher login."""
    username = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True)
    event_id = serializers.IntegerField(required=True)


class UsherProfileSerializer(serializers.ModelSerializer):
    """Serializer for usher profile."""
    events = serializers.SerializerMethodField()
    
    class Meta:
        model = Usher
        fields = [
            'id', 'name', 'email', 'phone', 'role', 'status',
            'location', 'experience', 'hourly_rate', 'total_hours',
            'total_events', 'rating', 'performance', 'hire_date',
            'last_active', 'events'
        ]
        read_only_fields = ['id', 'total_hours', 'total_events', 'hire_date']
    
    def get_events(self, obj):
        """Get assigned events."""
        events = obj.events.all()
        return [
            {
                'id': str(event.id),
                'title': event.title,
                'date': event.date.isoformat() if event.date else None,
                'time': event.time.isoformat() if event.time else None,
                'status': event.status,
                'venue': event.venue.name if event.venue else None,
            }
            for event in events
        ]


class EventSerializer(serializers.ModelSerializer):
    """Serializer for event details."""
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'date', 'time', 'venue_name',
            'organizer_name', 'status', 'image', 'category'
        ]


class AttendeeSerializer(serializers.Serializer):
    """Serializer for attendee information."""
    customer_id = serializers.CharField()  # Accept as string (UUID will be validated)
    name = serializers.CharField()
    photo = serializers.CharField(allow_null=True, required=False)
    card_id = serializers.CharField()
    ticket_id = serializers.CharField(allow_null=True, required=False)  # Accept as string
    ticket_status = serializers.CharField()
    ticket_tier = serializers.CharField()
    scan_status = serializers.CharField()
    emergency_contact = serializers.CharField(allow_null=True, required=False, help_text="Emergency contact mobile number")
    emergency_contact_name = serializers.CharField(allow_null=True, required=False, help_text="Emergency contact person name")
    phone_number = serializers.CharField(allow_null=True, required=False, help_text="Customer phone number")
    nationality = serializers.CharField(allow_null=True, required=False, help_text="Customer nationality")
    blood_type = serializers.CharField(allow_null=True, required=False)
    labels = serializers.ListField(
        child=serializers.DictField(allow_empty=True, required=False),
        allow_empty=True, 
        required=False,
        help_text="List of label objects with name, color, icon"
    )
    children = serializers.ListField(allow_empty=True, required=False)
    customer_events = serializers.ListField(allow_empty=True, required=False)  # All events customer has tickets for
    part_time_leave = serializers.DictField(allow_null=True, required=False)  # Part-time leave status
    last_scan = serializers.DictField(allow_null=True, required=False)  # Last scan information (scan_id, scanned_by, scan_timestamp, operator_name)


class ScanCardSerializer(serializers.Serializer):
    """Serializer for card verification."""
    card_id = serializers.CharField(max_length=100, required=True)


class ScanResultSerializer(serializers.Serializer):
    """Serializer for scan result."""
    card_id = serializers.CharField(max_length=100, required=True)
    event_id = serializers.CharField(required=True)  # Accept both int and UUID as string
    result = serializers.ChoiceField(
        choices=['valid', 'invalid', 'already_scanned', 'not_found'],
        required=True
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class ScanLogSerializer(serializers.ModelSerializer):
    """Serializer for scan logs."""
    event_title = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    
    def get_event_title(self, obj):
        """Get event title safely."""
        try:
            return obj.event.title if obj.event else 'Unknown Event'
        except Exception:
            return 'Unknown Event'
    
    def get_customer_name(self, obj):
        """Get customer name safely."""
        try:
            return obj.customer.name if obj.customer else None
        except Exception:
            return None
    operator_name = serializers.SerializerMethodField()
    operator_username = serializers.SerializerMethodField()
    card_id = serializers.SerializerMethodField()
    scan_time = serializers.DateTimeField(source='timestamp', read_only=True)
    result = serializers.SerializerMethodField()
    
    def get_operator_name(self, obj):
        """Get operator full name."""
        if obj.operator:
            if obj.operator.first_name or obj.operator.last_name:
                return f"{obj.operator.first_name or ''} {obj.operator.last_name or ''}".strip()
            return obj.operator.username or 'Unknown'
        return obj.operator_role or 'Unknown'
    
    def get_operator_username(self, obj):
        """Get operator username."""
        return obj.operator.username if obj.operator else None
    
    def get_card_id(self, obj):
        """Get card serial number."""
        try:
            return obj.nfc_card.serial_number if obj.nfc_card else None
        except Exception:
            return None
    
    def get_result(self, obj):
        """Map scan_result to readable format."""
        result_map = {
            'success': 'Valid',
            'invalid': 'Invalid',
            'duplicate': 'Already Scanned',
            'failed': 'Not Found'
        }
        return result_map.get(obj.scan_result, obj.scan_result)
    
    class Meta:
        model = CheckinLog
        fields = [
            'id', 'operator', 'operator_name', 'operator_username', 'operator_role',
            'event', 'event_title', 'customer', 'customer_name',
            'card_id', 'nfc_card', 'scan_time', 'timestamp', 'result', 'scan_result',
            'scan_type', 'notes', 'device_name', 'device_type'
        ]
        read_only_fields = ['id', 'scan_time', 'timestamp']


class ScanLogSearchSerializer(serializers.Serializer):
    """Serializer for scan log search."""
    card_id = serializers.CharField(required=False, allow_blank=True)
    usher_username = serializers.CharField(required=False, allow_blank=True)
    result = serializers.ChoiceField(
        choices=['valid', 'invalid', 'already_scanned', 'not_found'],
        required=False
    )
    attendee_name = serializers.CharField(required=False, allow_blank=True)
    event_id = serializers.UUIDField(required=False)


class PartTimeLeaveSerializer(serializers.ModelSerializer):
    """Serializer for part-time leave."""
    usher_name = serializers.SerializerMethodField()
    event_title = serializers.SerializerMethodField()
    usher = serializers.SerializerMethodField()
    event = serializers.SerializerMethodField()
    
    def get_usher_name(self, obj):
        """Safely get usher name."""
        try:
            return obj.usher.name if obj.usher and hasattr(obj.usher, 'name') else None
        except Exception:
            return None
    
    def get_event_title(self, obj):
        """Safely get event title."""
        try:
            return obj.event.title if obj.event and hasattr(obj.event, 'title') else None
        except Exception:
            return None
    
    def get_usher(self, obj):
        """Safely get usher ID."""
        try:
            return str(obj.usher.id) if obj.usher and hasattr(obj.usher, 'id') else None
        except Exception:
            return None
    
    def get_event(self, obj):
        """Safely get event ID."""
        try:
            return str(obj.event.id) if obj.event and hasattr(obj.event, 'id') else None
        except Exception:
            return None
    
    class Meta:
        model = PartTimeLeave
        fields = [
            'id', 'usher', 'usher_name', 'event', 'event_title',
            'leave_time', 'return_time', 'reason', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'usher', 'event']


class ScanReportSerializer(serializers.ModelSerializer):
    """Serializer for scan reports."""
    usher_name = serializers.CharField(source='usher.name', read_only=True)
    event_title = serializers.CharField(source='event.title', read_only=True)
    event = serializers.PrimaryKeyRelatedField(queryset=Event.objects.all(), required=True)
    ticket_id = serializers.UUIDField(required=False, allow_null=True)
    customer_id = serializers.UUIDField(required=False, allow_null=True)
    card_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100)
    description = serializers.CharField(required=True)
    report_type = serializers.ChoiceField(choices=ScanReport.REPORT_TYPE_CHOICES, required=True)
    
    class Meta:
        model = ScanReport
        fields = [
            'id', 'usher', 'usher_name', 'event', 'event_title',
            'report_type', 'description', 'card_id', 'ticket_id',
            'customer_id', 'status', 'admin_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usher', 'status', 'admin_notes', 'created_at', 'updated_at']
    
    def validate_ticket_id(self, value):
        """Convert empty string to None for ticket_id."""
        if value == '' or value is None:
            return None
        return value
    
    def validate_customer_id(self, value):
        """Convert empty string to None for customer_id."""
        if value == '' or value is None:
            return None
        return value
    
    def validate_card_id(self, value):
        """Convert empty string to None for card_id."""
        if value == '' or value is None:
            return None
        return value

