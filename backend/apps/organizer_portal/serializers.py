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
    gates_open_time = serializers.SerializerMethodField()
    closed_doors_time = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'date', 'time', 'location', 'status',
            'image_url', 'total_tickets', 'tickets_sold', 'tickets_available',
            'people_admitted', 'people_remaining', 'total_payout_pending',
            'total_payout_paid', 'ticket_categories', 'gates_open_time', 'closed_doors_time'
        ]
    
    def get_ticket_categories(self, obj):
        """Get ticket categories for this event."""
        from tickets.models import Ticket
        from events.models import TicketCategory
        
        try:
            ticket_categories = TicketCategory.objects.filter(event=obj)
            result = []
            for ticket_category in ticket_categories:
                # Exclude black card tickets from counts
                tickets = Ticket.objects.filter(
                    event=obj,
                    category=ticket_category.name,
                    is_black_card=False
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
            # Exclude black card tickets from counts
            return obj.tickets.filter(status__in=['valid', 'used'], is_black_card=False).count()
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
            # Exclude black card tickets from counts
            return obj.tickets.filter(status='used', is_black_card=False).count()
        except Exception:
            return 0
    
    def get_people_remaining(self, obj):
        """Get remaining tickets (total tickets minus tickets sold, excluding black card tickets)."""
        try:
            # Exclude black card tickets from counts
            tickets_sold = obj.tickets.filter(status__in=['valid', 'used'], is_black_card=False).count()
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
    
    def get_gates_open_time(self, obj):
        """Get gates open time."""
        if obj.gates_open_time:
            return obj.gates_open_time.strftime('%H:%M')
        return None
    
    def get_closed_doors_time(self, obj):
        """Get closed doors time."""
        if obj.closed_doors_time:
            return obj.closed_doors_time.strftime('%H:%M')
        return None


class OrganizerEventAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for detailed event analytics."""
    ticket_categories = serializers.SerializerMethodField()
    overall_stats = serializers.SerializerMethodField()
    payout_info = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    gates_open_time = serializers.SerializerMethodField()
    gender_distribution = serializers.SerializerMethodField()
    age_distribution = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'date', 'time', 'location', 'status',
            'description', 'about_venue', 'starting_price', 'featured',
            'ticket_categories', 'overall_stats', 'payout_info',
            'image_url', 'category_name', 'gates_open_time',
            'gender_distribution', 'age_distribution'
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
                # Count tickets for this category (excluding black card tickets)
                tickets = Ticket.objects.filter(
                    event=obj,
                    category=ticket_category.name,
                    is_black_card=False
                )
                
                # Total tickets allocated for this category
                total_tickets = ticket_category.total_tickets
                # Count of tickets sold (valid or used)
                sold = tickets.filter(status__in=['valid', 'used']).count()
                # Available = total allocated - sold
                available = max(0, total_tickets - sold)
                
                result.append({
                    'category': ticket_category.name,
                    'name': ticket_category.name,  # Add name for frontend compatibility
                    'price': float(ticket_category.price),
                    'total': total_tickets,  # Total tickets allocated for this category
                    'total_tickets': total_tickets,  # Same as total for consistency
                    'ticketsSold': sold,  # Add camelCase for frontend
                    'sold': sold,  # Keep snake_case for backward compatibility
                    'ticketsAvailable': available,  # Add camelCase for frontend
                    'available': available,  # Keep snake_case for backward compatibility
                })
            
            return result
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting ticket categories for event {obj.id}: {str(e)}")
            return []
    
    def get_overall_stats(self, obj):
        from tickets.models import Ticket
        # Exclude black card tickets from counts
        tickets = Ticket.objects.filter(event=obj, is_black_card=False)
        tickets_sold = tickets.filter(status__in=['valid', 'used']).count()
        return {
            'sold': tickets_sold,
            'available': obj.total_tickets,  # Total tickets created for the event
            'admitted': tickets.filter(status='used').count(),
            'remaining': obj.total_tickets - tickets_sold,  # Total tickets minus tickets sold
        }
    
    def get_payout_info(self, obj):
        from finances.models import Payout
        # Get organizer from request context (set by IsOrganizer permission class)
        request = self.context.get('request')
        if not request or not hasattr(request, 'organizer') or request.organizer is None:
            return {
                'pending': 0.0,
                'paid': 0.0,
            }
        
        organizer = request.organizer
        # Payout model doesn't have event field, filter by organizer instead
        return {
            'pending': float(Payout.objects.filter(organizer=organizer, status='pending').aggregate(
                total=Sum('amount')
            )['total'] or 0),
            'paid': float(Payout.objects.filter(organizer=organizer, status='completed').aggregate(
                total=Sum('amount')
            )['total'] or 0),
        }
    
    def get_gender_distribution(self, obj):
        """
        Get gender distribution for THIS SPECIFIC EVENT ONLY.
        Based on people who booked tickets for this event.
        """
        from tickets.models import Ticket
        from customers.models import Customer
        
        try:
            # Get all tickets for THIS SPECIFIC EVENT ONLY (excluding black card tickets)
            # Only count valid and used tickets (exclude refunded/banned)
            tickets = Ticket.objects.filter(
                event=obj,  # Filter by this specific event
                is_black_card=False,
                status__in=['valid', 'used']  # Only booked/used tickets
            ).select_related('customer')
            
            # Get unique customers who booked tickets for THIS EVENT
            # Using distinct() ensures each person is counted only once, even if they bought multiple tickets
            customer_ids = tickets.values_list('customer_id', flat=True).distinct()
            customers = Customer.objects.filter(id__in=customer_ids)
            
            # Initialize distribution
            distribution = {
                'male': 0,
                'female': 0,
                'prefer_not_to_say': 0,
                'other': 0,
                'unknown': 0
            }
            
            total = 0
            # Iterate through all customers to count gender (gender is chosen by user during signup)
            for customer in customers:
                total += 1
                gender = customer.gender
                
                if gender == 'male':
                    distribution['male'] += 1
                elif gender == 'female':
                    distribution['female'] += 1
                elif gender == 'other':
                    distribution['other'] += 1
                elif gender == 'prefer_not_to_say' or gender == 'prefer-not-to-say':
                    distribution['prefer_not_to_say'] += 1
                else:
                    # None, empty string, or any other value goes to unknown
                    # This happens when user didn't provide gender during signup
                    distribution['unknown'] += 1
            
            # Add total and percentages
            distribution['total'] = total
            if total > 0:
                distribution['percentages'] = {
                    'male': round((distribution['male'] / total) * 100, 2),
                    'female': round((distribution['female'] / total) * 100, 2),
                    'prefer_not_to_say': round((distribution['prefer_not_to_say'] / total) * 100, 2),
                    'other': round((distribution['other'] / total) * 100, 2),
                    'unknown': round((distribution['unknown'] / total) * 100, 2),
                }
            else:
                distribution['percentages'] = {
                    'male': 0,
                    'female': 0,
                    'prefer_not_to_say': 0,
                    'other': 0,
                    'unknown': 0,
                }
            
            return distribution
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting gender distribution for event {obj.id}: {str(e)}")
            return {
                'male': 0, 'female': 0, 'prefer_not_to_say': 0, 'other': 0, 'unknown': 0,
                'total': 0, 'percentages': {'male': 0, 'female': 0, 'prefer_not_to_say': 0, 'other': 0, 'unknown': 0}
            }
    
    def get_age_distribution(self, obj):
        """
        Get age range distribution for THIS SPECIFIC EVENT ONLY.
        Based on people who booked tickets for this event.
        """
        from tickets.models import Ticket
        from customers.models import Customer
        
        try:
            # Get all tickets for THIS SPECIFIC EVENT ONLY (excluding black card tickets)
            # Only count valid and used tickets (exclude refunded/banned)
            tickets = Ticket.objects.filter(
                event=obj,  # Filter by this specific event
                is_black_card=False,
                status__in=['valid', 'used']  # Only booked/used tickets
            ).select_related('customer')
            
            # Get unique customers who booked tickets for THIS EVENT
            # Using distinct() ensures each person is counted only once, even if they bought multiple tickets
            customer_ids = tickets.values_list('customer_id', flat=True).distinct()
            customers = Customer.objects.filter(id__in=customer_ids)
            
            # Calculate age ranges using proper age calculation
            from datetime import date
            today = date.today()
            age_ranges = {
                '0-17': 0,
                '18-24': 0,
                '25-34': 0,
                '35-44': 0,
                '45-54': 0,
                '55-64': 0,
                '65+': 0,
                'unknown': 0
            }
            
            total = 0
            for customer in customers:
                # Use the calculate_age method which properly accounts for birthday
                # Age is automatically calculated from DOB (date_of_birth) that user provides during signup
                age = customer.calculate_age()
                
                if age is not None:
                    # Age was successfully calculated from DOB
                    total += 1
                    
                    if age < 18:
                        age_ranges['0-17'] += 1
                    elif age < 25:
                        age_ranges['18-24'] += 1
                    elif age < 35:
                        age_ranges['25-34'] += 1
                    elif age < 45:
                        age_ranges['35-44'] += 1
                    elif age < 55:
                        age_ranges['45-54'] += 1
                    elif age < 65:
                        age_ranges['55-64'] += 1
                    else:
                        age_ranges['65+'] += 1
                else:
                    # DOB is missing - count as unknown
                    age_ranges['unknown'] += 1
                    total += 1
            
            # Add total and percentages
            age_ranges['total'] = total
            if total > 0:
                age_ranges['percentages'] = {
                    '0-17': round((age_ranges['0-17'] / total) * 100, 2),
                    '18-24': round((age_ranges['18-24'] / total) * 100, 2),
                    '25-34': round((age_ranges['25-34'] / total) * 100, 2),
                    '35-44': round((age_ranges['35-44'] / total) * 100, 2),
                    '45-54': round((age_ranges['45-54'] / total) * 100, 2),
                    '55-64': round((age_ranges['55-64'] / total) * 100, 2),
                    '65+': round((age_ranges['65+'] / total) * 100, 2),
                    'unknown': round((age_ranges['unknown'] / total) * 100, 2),
                }
            else:
                age_ranges['percentages'] = {
                    '0-17': 0, '18-24': 0, '25-34': 0, '35-44': 0,
                    '45-54': 0, '55-64': 0, '65+': 0, 'unknown': 0
                }
            
            return age_ranges
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting age distribution for event {obj.id}: {str(e)}")
            return {
                '0-17': 0, '18-24': 0, '25-34': 0, '35-44': 0,
                '45-54': 0, '55-64': 0, '65+': 0, 'unknown': 0,
                'total': 0,
                'percentages': {'0-17': 0, '18-24': 0, '25-34': 0, '35-44': 0,
                               '45-54': 0, '55-64': 0, '65+': 0, 'unknown': 0}
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
    event_title = serializers.CharField(source='event.title', read_only=True)
    organizer_name = serializers.CharField(source='organizer.name', read_only=True)
    new_event_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = EventEditRequest
        fields = [
            'id', 'event', 'event_title', 'organizer', 'organizer_name',
            'requested_changes', 'requested_data', 'file_attachments',
            'new_event_image', 'new_event_image_url',
            'status', 'admin_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'admin_notes', 'created_at', 'updated_at']
    
    def get_new_event_image_url(self, obj):
        """Get full URL for new event image."""
        if obj.new_event_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.new_event_image.url)
            return obj.new_event_image.url
        return None


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

