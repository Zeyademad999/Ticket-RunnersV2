"""
Serializers for Organizer Portal.
"""
from rest_framework import serializers
from django.db.models import Q, Count, Sum
from users.models import Organizer, OrganizerEditRequest
from events.models import Event
from finances.models import Payout
from apps.organizer_portal.models import EventEditRequest


class OrganizerLoginSerializer(serializers.Serializer):
    """Serializer for organizer login."""
    mobile = serializers.CharField(max_length=20, required=True)
    password = serializers.CharField(write_only=True, required=True)


class OrganizerOTPSerializer(serializers.Serializer):
    """Serializer for OTP verification."""
    mobile = serializers.CharField(max_length=20, required=True)
    otp_code = serializers.CharField(max_length=6, required=True)


class OrganizerProfileSerializer(serializers.ModelSerializer):
    """Serializer for organizer profile."""
    profile_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Organizer
        fields = [
            'id', 'name', 'email', 'phone', 'contact_mobile',
            'tax_id', 'commercial_registration', 'legal_business_name',
            'trade_name', 'about', 'profile_image', 'category', 'location',
            'status', 'verified', 'total_events', 'total_revenue',
            'commission_rate', 'rating', 'registration_date'
        ]
        read_only_fields = ['id', 'total_events', 'total_revenue', 'registration_date']
    
    def get_profile_image(self, obj):
        """Get full URL for profile image."""
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None


class OrganizerEventSerializer(serializers.ModelSerializer):
    """Serializer for organizer events list."""
    tickets_sold = serializers.SerializerMethodField()
    tickets_available = serializers.SerializerMethodField()
    people_admitted = serializers.SerializerMethodField()
    people_remaining = serializers.SerializerMethodField()
    total_payout_pending = serializers.SerializerMethodField()
    total_payout_paid = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    ticket_categories = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'date', 'time', 'location', 'status',
            'image_url', 'total_tickets', 'tickets_sold', 'tickets_available',
            'people_admitted', 'people_remaining', 'total_payout_pending',
            'total_payout_paid', 'ticket_categories'
        ]
    
    def get_ticket_categories(self, obj):
        """Get ticket categories for this event."""
        from tickets.models import Ticket
        from events.models import TicketCategory
        
        try:
            ticket_categories = TicketCategory.objects.filter(event=obj)
            result = []
            for ticket_category in ticket_categories:
                tickets = Ticket.objects.filter(
                    event=obj,
                    category=ticket_category.name
                )
                total = tickets.count()
                sold = tickets.filter(status__in=['valid', 'used']).count()
                available = tickets.filter(status='valid').count()
                
                result.append({
                    'category': ticket_category.name,
                    'name': ticket_category.name,
                    'price': float(ticket_category.price),
                    'total': total,
                    'total_tickets': ticket_category.total_tickets,
                    'sold': sold,
                    'available': available,
                })
            return result
        except Exception:
            return []
    
    def get_location(self, obj):
        """Get location from venue or return empty string."""
        try:
            if obj.venue:
                return obj.venue.address or obj.venue.name or ""
            return ""
        except Exception:
            return ""
    
    def get_image_url(self, obj):
        """Get image URL."""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_tickets_sold(self, obj):
        try:
            return obj.tickets.filter(status__in=['valid', 'used']).count()
        except Exception:
            return 0
    
    def get_tickets_available(self, obj):
        """Get total tickets available (total tickets created for the event)."""
        try:
            return obj.total_tickets
        except Exception:
            return 0
    
    def get_people_admitted(self, obj):
        try:
            return obj.tickets.filter(status='used').count()
        except Exception:
            return 0
    
    def get_people_remaining(self, obj):
        """Get remaining tickets (total tickets minus tickets sold)."""
        try:
            tickets_sold = obj.tickets.filter(status__in=['valid', 'used']).count()
            return obj.total_tickets - tickets_sold
        except Exception:
            return 0
    
    def get_total_payout_pending(self, obj):
        try:
            from finances.models import Payout
            # Payout model doesn't have event field, filter by organizer instead
            result = Payout.objects.filter(organizer=obj.organizer, status='pending').aggregate(
                total=Sum('amount')
            )
            return float(result['total'] or 0)
        except Exception:
            return 0.0
    
    def get_total_payout_paid(self, obj):
        try:
            from finances.models import Payout
            # Payout model doesn't have event field, filter by organizer instead
            result = Payout.objects.filter(organizer=obj.organizer, status='completed').aggregate(
                total=Sum('amount')
            )
            return float(result['total'] or 0)
        except Exception:
            return 0.0


class OrganizerEventAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for detailed event analytics."""
    ticket_categories = serializers.SerializerMethodField()
    overall_stats = serializers.SerializerMethodField()
    payout_info = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    gates_open_time = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'date', 'time', 'location', 'status',
            'description', 'about_venue', 'starting_price', 'featured',
            'ticket_categories', 'overall_stats', 'payout_info',
            'image_url', 'category_name', 'gates_open_time'
        ]
    
    def get_location(self, obj):
        """Get location from venue or return empty string."""
        try:
            if obj.venue:
                return obj.venue.address or obj.venue.name or ""
            return ""
        except Exception:
            return ""
    
    def get_image_url(self, obj):
        """Get full URL for event image."""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def get_category_name(self, obj):
        """Get category name."""
        if obj.category:
            return obj.category.name
        return None
    
    def get_gates_open_time(self, obj):
        """Get gates open time."""
        if obj.gates_open_time:
            return obj.gates_open_time.strftime('%H:%M')
        return None
    
    def get_ticket_categories(self, obj):
        from tickets.models import Ticket
        from events.models import TicketCategory
        
        try:
            # Get all ticket categories for this event (prefetch for efficiency)
            ticket_categories = TicketCategory.objects.filter(event=obj).select_related('event')
            
            result = []
            for ticket_category in ticket_categories:
                # Count tickets for this category
                tickets = Ticket.objects.filter(
                    event=obj,
                    category=ticket_category.name
                )
                
                total = tickets.count()
                sold = tickets.filter(status__in=['valid', 'used']).count()
                available = tickets.filter(status='valid').count()
                
                result.append({
                    'category': ticket_category.name,
                    'name': ticket_category.name,  # Add name for frontend compatibility
                    'price': float(ticket_category.price),
                    'total': total,
                    'total_tickets': ticket_category.total_tickets,  # Total tickets allocated for this category
                    'sold': sold,
                    'available': available,
                })
            
            return result
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting ticket categories for event {obj.id}: {str(e)}")
            return []
    
    def get_overall_stats(self, obj):
        from tickets.models import Ticket
        tickets = Ticket.objects.filter(event=obj)
        tickets_sold = tickets.filter(status__in=['valid', 'used']).count()
        return {
            'sold': tickets_sold,
            'available': obj.total_tickets,  # Total tickets created for the event
            'admitted': tickets.filter(status='used').count(),
            'remaining': obj.total_tickets - tickets_sold,  # Total tickets minus tickets sold
        }
    
    def get_payout_info(self, obj):
        from finances.models import Payout
        # Payout model doesn't have event field, filter by organizer instead
        return {
            'pending': float(Payout.objects.filter(organizer=obj.organizer, status='pending').aggregate(
                total=Sum('amount')
            )['total'] or 0),
            'paid': float(Payout.objects.filter(organizer=obj.organizer, status='completed').aggregate(
                total=Sum('amount')
            )['total'] or 0),
        }


class OrganizerPayoutSerializer(serializers.ModelSerializer):
    """Serializer for organizer payouts."""
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    
    class Meta:
        model = Payout
        fields = [
            'id', 'reference', 'organizer', 'organizer_name',
            'amount', 'status', 'method', 'created_at', 'processed_at'
        ]
        read_only_fields = ['id', 'reference', 'created_at']


class EventEditRequestSerializer(serializers.ModelSerializer):
    """Serializer for event edit requests."""
    
    class Meta:
        model = EventEditRequest
        fields = [
            'id', 'event', 'requested_changes', 'file_attachments',
            'status', 'admin_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'admin_notes', 'created_at', 'updated_at']


class OrganizerEditRequestSerializer(serializers.ModelSerializer):
    """Serializer for organizer profile edit requests."""
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    organizer_email = serializers.CharField(source='organizer.email', read_only=True)
    profile_image_url = serializers.SerializerMethodField()
    processed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = OrganizerEditRequest
        fields = [
            'id', 'organizer', 'organizer_name', 'organizer_email',
            'status', 'requested_data', 'profile_image', 'profile_image_url',
            'processed_by', 'processed_by_name', 'rejection_reason',
            'created_at', 'processed_at'
        ]
        read_only_fields = ['id', 'status', 'processed_by', 'processed_at', 'created_at']
    
    def get_profile_image_url(self, obj):
        """Get full URL for profile image."""
        if obj.profile_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None
    
    def get_processed_by_name(self, obj):
        """Get processed by username, handling None case."""
        if obj.processed_by:
            return obj.processed_by.username
        return None

