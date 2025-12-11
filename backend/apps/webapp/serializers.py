"""
Serializers for WebApp Portal (User-Facing).
"""
from rest_framework import serializers
from customers.models import Customer, Dependent
from events.models import Event, TicketCategory
from tickets.models import Ticket, TicketMarketplaceListing
from nfc_cards.models import NFCCard, NFCCardAutoReload
from payments.models import PaymentTransaction
from apps.webapp.models import Favorite


class UserRegistrationSerializer(serializers.Serializer):
    """Serializer for user registration."""
    OTP_DELIVERY_CHOICES = ['sms', 'email']
    
    mobile_number = serializers.CharField(max_length=20, required=True)
    password = serializers.CharField(write_only=True, required=False, min_length=6, allow_blank=True)
    name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    national_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    nationality = serializers.CharField(max_length=100, required=False, allow_blank=True)
    gender = serializers.ChoiceField(choices=['male', 'female', 'other'], required=False, allow_blank=True, allow_null=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    otp_delivery_method = serializers.ChoiceField(choices=OTP_DELIVERY_CHOICES, required=False, default='sms')
    
    def validate(self, data):
        """Validate that either name or first_name+last_name is provided."""
        if not data.get('name') and not (data.get('first_name') and data.get('last_name')):
            raise serializers.ValidationError("Either 'name' or both 'first_name' and 'last_name' must be provided.")
        
        # Combine first_name and last_name into name if name is not provided
        if not data.get('name') and data.get('first_name') and data.get('last_name'):
            data['name'] = f"{data['first_name']} {data['last_name']}".strip()
        
        return data


class UserOTPSerializer(serializers.Serializer):
    """Serializer for OTP verification."""
    mobile_number = serializers.CharField(max_length=20, required=True)
    otp_code = serializers.CharField(max_length=6, required=True)


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    mobile_number = serializers.CharField(max_length=20, required=True)
    password = serializers.CharField(write_only=True, required=True)


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""
    profile_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone', 'mobile_number', 'national_id', 'nationality',
            'gender', 'date_of_birth', 'status', 'total_bookings', 'total_spent', 'attended_events',
            'is_recurrent', 'registration_date', 'emergency_contact_name', 'emergency_contact_mobile',
            'blood_type', 'profile_image', 'labels'
        ]
        read_only_fields = ['id', 'total_bookings', 'total_spent', 'attended_events', 'registration_date', 'national_id']
    
    def get_profile_image(self, obj):
        """Get full URL for profile image."""
        if obj.profile_image:
            # Return relative URL that works with Vite proxy
            # The frontend will handle the proxy routing
            if hasattr(obj.profile_image, 'url'):
                # Return relative path starting with /media/
                url = obj.profile_image.url
                # Ensure it starts with /media/
                if not url.startswith('/'):
                    url = '/' + url
                return url
            return str(obj.profile_image) if obj.profile_image else None
        return None
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
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


class DependentSerializer(serializers.ModelSerializer):
    """Serializer for dependents."""
    
    class Meta:
        model = Dependent
        fields = ['id', 'name', 'date_of_birth', 'relationship', 'created_at']
        read_only_fields = ['id', 'created_at']


class TicketCategorySerializer(serializers.ModelSerializer):
    """Serializer for ticket categories in public events."""
    sold_tickets = serializers.IntegerField(read_only=True)
    tickets_available = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = TicketCategory
        fields = [
            'id', 'name', 'price', 'total_tickets', 'sold_tickets',
            'tickets_available', 'description', 'color', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sold_tickets', 'tickets_available', 'created_at', 'updated_at']


class PublicEventSerializer(serializers.ModelSerializer):
    """Serializer for public event listing."""
    ticket_categories = TicketCategorySerializer(many=True, read_only=True)
    
    organizer_name = serializers.SerializerMethodField()
    organizer_id = serializers.SerializerMethodField()
    organizer = serializers.SerializerMethodField()
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    venue_address = serializers.CharField(source='venue.address', read_only=True)
    venue_city = serializers.CharField(source='venue.city', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_id = serializers.IntegerField(source='category.id', read_only=True)
    # For frontend compatibility - use venue address as location
    location = serializers.SerializerMethodField()
    thumbnail_path = serializers.SerializerMethodField()
    starting_price = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    venue_layout_image = serializers.SerializerMethodField()
    tickets_available = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'artist_name', 'description', 'about_venue', 'gates_open_time', 'closed_doors_time', 'terms_and_conditions',
            'date', 'time', 
            'location', 'venue_name', 'venue_address', 'venue_city',
            'organizer_name', 'organizer_id', 'organizer', 'category_id', 'category_name', 'status',
            'featured', 'total_tickets', 'ticket_limit', 'ticket_transfer_enabled',
            'thumbnail_path', 'starting_price', 'image', 'venue_layout_image', 'ticket_categories',
            'tickets_available', 'marketplace_max_price',
            'child_eligibility_enabled', 'child_eligibility_rule_type',
            'child_eligibility_min_age', 'child_eligibility_max_age',
            'wheelchair_access', 'bathroom', 'parking', 'non_smoking'
        ]
    
    def get_organizer_name(self, obj):
        """Get organizer names as comma-separated string."""
        organizers = obj.organizers.all()
        if organizers.exists():
            return ", ".join([org.name for org in organizers])
        return None
    
    def get_organizer_id(self, obj):
        """Get first organizer ID for backward compatibility."""
        first_organizer = obj.organizers.first()
        return first_organizer.id if first_organizer else None
    
    def get_organizer(self, obj):
        """Get organizer details as a list of objects."""
        organizers = obj.organizers.all()
        if organizers.exists():
            request = self.context.get('request')
            result = []
            for org in organizers:
                logo_url = None
                if org.profile_image:
                    if request:
                        logo_url = request.build_absolute_uri(org.profile_image.url)
                    else:
                        logo_url = org.profile_image.url if hasattr(org.profile_image, 'url') else str(org.profile_image)
                
                result.append({
                    'id': org.id,
                    'name': org.name,
                    'logo': logo_url,
                })
            return result
        return []
    
    def get_image(self, obj):
        """Get event main image URL."""
        if obj.image:
            # Return relative URL so it works with Vite proxy
            return obj.image.url if hasattr(obj.image, 'url') else str(obj.image)
        return None
    
    def get_venue_layout_image(self, obj):
        """Get venue layout image URL."""
        if obj.venue_layout_image:
            # Return relative URL so it works with Vite proxy
            return obj.venue_layout_image.url if hasattr(obj.venue_layout_image, 'url') else str(obj.venue_layout_image)
        return None
    
    def get_location(self, obj):
        """Return venue address as location for frontend compatibility."""
        if obj.venue:
            return f"{obj.venue.address}, {obj.venue.city}" if obj.venue.address else obj.venue.city or ""
        return ""
    
    def get_thumbnail_path(self, obj):
        """Get event main image/thumbnail."""
        if obj.image:
            return obj.image.url if hasattr(obj.image, 'url') else str(obj.image)
        return ""
    
    def get_starting_price(self, obj):
        """Get the starting price for this event."""
        # Use the event's starting_price field if set, otherwise calculate from tickets
        if obj.starting_price:
            return str(obj.starting_price)
        
        # Fallback to minimum ticket price if starting_price is not set
        from tickets.models import Ticket
        from django.db.models import Min
        
        min_price = Ticket.objects.filter(event=obj).aggregate(
            min_price=Min('price')
        )['min_price']
        
        return str(min_price) if min_price else None


class TicketDetailSerializer(serializers.Serializer):
    """Serializer for individual ticket details."""
    name = serializers.CharField(required=False, allow_blank=True)
    mobile = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    is_owner = serializers.BooleanField(default=False)
    category = serializers.CharField(required=False, allow_blank=True)  # Ticket category for this specific ticket
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)  # Price for this specific ticket
    has_child = serializers.BooleanField(required=False, default=False)  # Ticket holder has a child
    child_age = serializers.IntegerField(required=False, allow_null=True)  # Age of the child


class TicketBookingSerializer(serializers.Serializer):
    """Serializer for ticket booking."""
    event_id = serializers.IntegerField(required=True)
    category = serializers.CharField(required=True)
    quantity = serializers.IntegerField(required=True, min_value=1)
    payment_method = serializers.ChoiceField(
        choices=['credit_card', 'debit_card', 'nfc_card', 'digital_wallet', 'black_card_free'],
        required=True
    )
    ticket_details = TicketDetailSerializer(many=True, required=False, allow_empty=True)


class TicketSerializer(serializers.ModelSerializer):
    """Serializer for user tickets."""
    event_title = serializers.SerializerMethodField()
    event_date = serializers.SerializerMethodField()
    event_time = serializers.SerializerMethodField()
    
    def get_event_title(self, obj):
        """Get event title safely."""
        return obj.event.title if obj.event else ''
    
    def get_event_date(self, obj):
        """Get event date safely."""
        return obj.event.date if obj.event else None
    
    def get_event_time(self, obj):
        """Get event time safely."""
        return obj.event.time if obj.event else None
    
    # Buyer information (who purchased the ticket)
    buyer_name = serializers.SerializerMethodField()
    buyer_mobile = serializers.SerializerMethodField()
    buyer_email = serializers.SerializerMethodField()
    
    # Assigned person information (if ticket was assigned to someone else)
    assigned_name = serializers.CharField(read_only=True)
    assigned_mobile = serializers.CharField(read_only=True)
    assigned_email = serializers.EmailField(read_only=True)
    
    # Check if this ticket was assigned to current user
    is_assigned_to_me = serializers.SerializerMethodField()
    
    # Check if this ticket was assigned to someone else
    is_assigned_to_other = serializers.SerializerMethodField()
    
    # Check if ticket needs to be claimed (assigned but not yet claimed)
    needs_claiming = serializers.SerializerMethodField()
    
    # Transfer information (who transferred this ticket to current user)
    transferred_from_name = serializers.SerializerMethodField()
    transferred_from_mobile = serializers.SerializerMethodField()
    is_transferred = serializers.SerializerMethodField()
    
    def get_buyer_name(self, obj):
        """Get buyer's name (original purchaser)."""
        # Check if ticket was assigned by admin using payment transaction
        from payments.models import PaymentTransaction
        payment = PaymentTransaction.objects.filter(ticket=obj).order_by('-created_at').first()
        is_admin_assigned = payment and payment.payment_method in ['admin_assigned', 'paid_outside_system']
        
        # Use buyer field if available, otherwise fallback to customer
        buyer = obj.buyer if hasattr(obj, 'buyer') and obj.buyer else obj.customer
        if buyer:
            # If ticket has assigned_mobile, it's an assigned ticket
            # Check if it was assigned by admin (via payment method or buyer is admin)
            if obj.assigned_mobile:
                # Check payment method first (most reliable)
                if is_admin_assigned:
                    return 'System Admin'
                
                # Check if buyer is an admin user
                if hasattr(buyer, 'user') and buyer.user:
                    if buyer.user.is_staff or buyer.user.is_superuser:
                        return 'System Admin'
                
                # If ticket has assigned_mobile and buyer != customer, it's an assigned ticket
                # For admin-assigned tickets created before the fix, buyer might be the assigned customer
                # In this case, if buyer == customer and ticket is assigned, it's likely admin-assigned
                if hasattr(obj, 'customer') and obj.customer:
                    # If buyer == customer but ticket is assigned, it might be admin-assigned (old tickets)
                    # Show System Admin for all assigned tickets to be safe
                    return 'System Admin'
            
            # Check if buyer is an admin user (has user with is_staff or is_superuser)
            if hasattr(buyer, 'user') and buyer.user:
                if buyer.user.is_staff or buyer.user.is_superuser:
                    return 'System Admin'
            
            return buyer.name or ''
        return ''
    
    def get_buyer_mobile(self, obj):
        """Get buyer's mobile number."""
        buyer = obj.buyer if hasattr(obj, 'buyer') and obj.buyer else obj.customer
        if buyer:
            return buyer.mobile_number or ''
        return ''
    
    def get_buyer_email(self, obj):
        """Get buyer's email."""
        buyer = obj.buyer if hasattr(obj, 'buyer') and obj.buyer else obj.customer
        if buyer:
            return buyer.email or ''
        return ''
    
    def get_is_assigned_to_me(self, obj):
        """Check if ticket was assigned to current user."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'customer'):
            return False
        current_customer = request.customer
        if not current_customer or not current_customer.mobile_number:
            return False
        # Ticket is assigned to me if:
        # 1. assigned_mobile matches my mobile, OR
        # 2. I am the customer but there's an assigned_mobile (meaning it was assigned to me)
        # 3. I am the customer and buyer is different from me (meaning someone else bought it for me)
        is_assigned_by_mobile = (obj.assigned_mobile and 
                                 current_customer.mobile_number and 
                                 obj.assigned_mobile == current_customer.mobile_number)
        is_assigned_to_me = (obj.customer == current_customer and 
                            obj.assigned_mobile and 
                            obj.buyer and 
                            obj.buyer != current_customer)
        return is_assigned_by_mobile or is_assigned_to_me
    
    def get_is_assigned_to_other(self, obj):
        """Check if ticket was assigned to someone else."""
        return bool(obj.assigned_mobile and obj.assigned_name)
    
    def get_needs_claiming(self, obj):
        """Check if ticket needs to be claimed (assigned but not yet claimed)."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'customer'):
            return False
        current_customer = request.customer
        if not current_customer or not current_customer.mobile_number:
            return False
        # Ticket needs claiming if:
        # 1. assigned_mobile matches current user's mobile
        # 2. BUT customer != current_customer (ticket hasn't been claimed yet)
        is_assigned_to_me = (obj.assigned_mobile and 
                            current_customer.mobile_number and 
                            obj.assigned_mobile == current_customer.mobile_number)
        is_not_claimed = (obj.customer != current_customer)
        return is_assigned_to_me and is_not_claimed
    
    def get_transferred_from_name(self, obj):
        """Get name of person who transferred this ticket to current user."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'customer'):
            return ''
        current_customer = request.customer
        if not current_customer:
            return ''
        
        # Check if this ticket was transferred to current user
        # Ticket is transferred if: buyer != customer AND customer == current_customer AND buyer != current_customer
        # AND there's a TicketTransfer record
        if obj.customer == current_customer and obj.buyer and obj.buyer != current_customer:
            # Check if there's a transfer record
            from tickets.models import TicketTransfer
            transfer = TicketTransfer.objects.filter(
                ticket=obj,
                to_customer=current_customer,
                status='completed'
            ).select_related('from_customer').first()
            
            if transfer and transfer.from_customer:
                return transfer.from_customer.name or ''
        
        return ''
    
    def get_transferred_from_mobile(self, obj):
        """Get mobile of person who transferred this ticket to current user."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'customer'):
            return ''
        current_customer = request.customer
        if not current_customer:
            return ''
        
        # Check if this ticket was transferred to current user
        if obj.customer == current_customer and obj.buyer and obj.buyer != current_customer:
            from tickets.models import TicketTransfer
            transfer = TicketTransfer.objects.filter(
                ticket=obj,
                to_customer=current_customer,
                status='completed'
            ).select_related('from_customer').first()
            
            if transfer and transfer.from_customer:
                return transfer.from_customer.mobile_number or ''
        
        return ''
    
    def get_is_transferred(self, obj):
        """Check if this ticket was transferred to current user."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'customer'):
            return False
        current_customer = request.customer
        if not current_customer:
            return False
        
        # Ticket is transferred if: customer == current_customer AND buyer != current_customer
        # AND there's a TicketTransfer record
        if obj.customer == current_customer and obj.buyer and obj.buyer != current_customer:
            from tickets.models import TicketTransfer
            transfer = TicketTransfer.objects.filter(
                ticket=obj,
                to_customer=current_customer,
                status='completed'
            ).first()
            return transfer is not None
        
        return False
    
    event_id = serializers.SerializerMethodField()
    
    def get_event_id(self, obj):
        """Get event ID safely."""
        return str(obj.event.id) if obj.event else ''
    
    # Transfer fee information from event
    ticket_transfer_enabled = serializers.SerializerMethodField()
    transfer_fee_type = serializers.SerializerMethodField()
    transfer_fee_value = serializers.SerializerMethodField()
    
    def get_ticket_transfer_enabled(self, obj):
        """Get ticket transfer enabled status safely."""
        return obj.event.ticket_transfer_enabled if obj.event else None
    
    def get_transfer_fee_type(self, obj):
        """Get transfer fee type safely."""
        return obj.event.transfer_fee_type if obj.event else None
    
    def get_transfer_fee_value(self, obj):
        """Get transfer fee value safely."""
        return obj.event.transfer_fee_value if obj.event else None
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'event', 'event_id', 'event_title', 'event_date', 'event_time',
            'category', 'price', 'status', 'purchase_date', 'ticket_number',
            'check_in_time', 'assigned_name', 'assigned_mobile', 'assigned_email',
            'buyer_name', 'buyer_mobile', 'buyer_email',
            'is_assigned_to_me', 'is_assigned_to_other', 'needs_claiming', 'ticket_transfer_enabled',
            'transferred_from_name', 'transferred_from_mobile', 'is_transferred',
            'transfer_fee_type', 'transfer_fee_value', 'has_child', 'child_age'
        ]


class NFCCardSerializer(serializers.ModelSerializer):
    """Serializer for NFC cards."""
    
    class Meta:
        model = NFCCard
        fields = [
            'id', 'serial_number', 'status', 'balance', 'issue_date',
            'expiry_date', 'last_used', 'usage_count', 'card_type'
        ]


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for payment transactions."""
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'amount', 'payment_method', 'status', 'transaction_id',
            'created_at'
        ]
        read_only_fields = ['id', 'transaction_id', 'created_at']


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for favorites."""
    event_title = serializers.CharField(source='event.title', read_only=True)
    
    class Meta:
        model = Favorite
        fields = ['id', 'event', 'event_title', 'created_at']
        read_only_fields = ['id', 'created_at']


class TicketMarketplaceListingSerializer(serializers.ModelSerializer):
    """Serializer for ticket marketplace listings."""
    # Ticket details
    ticket_id = serializers.UUIDField(source='ticket.id', read_only=True)
    ticket_number = serializers.CharField(source='ticket.ticket_number', read_only=True)
    ticket_category = serializers.CharField(source='ticket.category', read_only=True)
    ticket_price = serializers.DecimalField(source='ticket.price', max_digits=10, decimal_places=2, read_only=True)
    ticket_status = serializers.CharField(source='ticket.status', read_only=True)
    
    # Event details
    event_id = serializers.IntegerField(source='ticket.event.id', read_only=True)
    event_title = serializers.CharField(source='ticket.event.title', read_only=True)
    event_date = serializers.DateField(source='ticket.event.date', read_only=True)
    event_time = serializers.TimeField(source='ticket.event.time', read_only=True)
    event_location = serializers.SerializerMethodField()
    event_category = serializers.SerializerMethodField()
    event_image = serializers.SerializerMethodField()
    
    # Seller contact info (only for authenticated users)
    seller_name = serializers.SerializerMethodField()
    seller_mobile = serializers.SerializerMethodField()
    seller_email = serializers.SerializerMethodField()
    is_my_listing = serializers.SerializerMethodField()
    
    def get_seller_name(self, obj):
        """Get seller name - always visible."""
        return obj.customer.name if obj.customer else ""
    
    def get_seller_mobile(self, obj):
        """Get seller mobile - only for authenticated users."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.customer.mobile_number if obj.customer else None
        return None
    
    def get_seller_email(self, obj):
        """Get seller email - only for authenticated users."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.customer.email if obj.customer else None
        return None
    
    def get_is_my_listing(self, obj):
        """Check if this listing belongs to the current user."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            customer = getattr(request, 'customer', None)
            if customer and obj.customer:
                return customer.id == obj.customer.id
        return False
    
    # Listing metadata
    listed_at = serializers.DateTimeField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    
    def get_event_location(self, obj):
        """Get event location."""
        if obj.ticket.event and obj.ticket.event.venue:
            venue = obj.ticket.event.venue
            if venue.address:
                return f"{venue.address}, {venue.city}" if venue.city else venue.address
            return venue.city or ""
        return ""
    
    def get_event_category(self, obj):
        """Get event category name."""
        if obj.ticket.event and obj.ticket.event.category:
            return obj.ticket.event.category.name
        return None
    
    def get_event_image(self, obj):
        """Get event image URL."""
        if obj.ticket.event and obj.ticket.event.image:
            if hasattr(obj.ticket.event.image, 'url'):
                return obj.ticket.event.image.url
            return str(obj.ticket.event.image)
        return None
    
    seller_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=True, allow_null=False)
    
    class Meta:
        model = TicketMarketplaceListing
        fields = [
            'id', 'ticket_id', 'ticket_number', 'ticket_category', 'ticket_price', 'ticket_status',
            'event_id', 'event_title', 'event_date', 'event_time', 'event_location', 
            'event_category', 'event_image',
            'seller_name', 'seller_mobile', 'seller_email',
            'listed_at', 'is_active', 'terms_accepted_at', 'is_my_listing', 'seller_price'
        ]
        read_only_fields = ['id', 'listed_at', 'is_active']
