"""
Serializers for events app.
"""
from rest_framework import serializers
from .models import Event, EventCategory, TicketCategory


class EventCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for EventCategory model.
    """
    class Meta:
        model = EventCategory
        fields = ['id', 'name', 'description', 'icon', 'created_at']
        read_only_fields = ['id', 'created_at']


class TicketCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for TicketCategory model.
    """
    sold_tickets = serializers.IntegerField(read_only=True)
    tickets_available = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = TicketCategory
        fields = [
            'id', 'name', 'price', 'total_tickets', 'sold_tickets',
            'tickets_available', 'description', 'color', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sold_tickets', 'tickets_available', 'created_at', 'updated_at']


class EventListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for Event list view.
    """
    organizer_name = serializers.SerializerMethodField()
    venue_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    thumbnail_path = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    starting_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    revenue = serializers.SerializerMethodField()
    commission = serializers.SerializerMethodField()
    commission_rate = serializers.SerializerMethodField()
    ticket_categories = TicketCategorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'artist_name', 'date', 'time', 'status', 'organizer_name',
            'venue_name', 'category_name', 'total_tickets', 'ticket_limit', 'is_ticket_limit_unlimited', 'tickets_sold',
            'tickets_available', 'created_at', 'thumbnail_path', 'image_url',
            'location', 'starting_price', 'revenue', 'commission', 'commission_rate',
            'child_eligibility_enabled', 'child_eligibility_rule_type',
            'child_eligibility_min_age', 'child_eligibility_max_age', 'ticket_categories',
            'wheelchair_access', 'bathroom', 'parking', 'non_smoking'
        ]
        read_only_fields = ['id', 'tickets_sold', 'tickets_available', 'created_at']
    
    def get_organizer_name(self, obj):
        """Get organizer names, handling None/empty values."""
        organizers = obj.organizers.all()
        if organizers.exists():
            # Return comma-separated list of organizer names
            return ", ".join([org.name for org in organizers])
        return None
    
    def get_venue_name(self, obj):
        """Get venue name, handling None values."""
        return obj.venue.name if obj.venue else None
    
    def get_category_name(self, obj):
        """Get category name, handling None values."""
        return obj.category.name if obj.category else None
    
    def get_thumbnail_path(self, obj):
        """Return the thumbnail/image path as a full URL."""
        if obj.image:
            request = self.context.get('request')
            if request:
                try:
                    return request.build_absolute_uri(obj.image.url)
                except:
                    # Fallback if URL building fails
                    try:
                        return obj.image.url
                    except:
                        return None
            # If no request context, return relative URL
            try:
                return obj.image.url
            except:
                return None
        return None
    
    def get_image_url(self, obj):
        """Alias for thumbnail_path for compatibility."""
        return self.get_thumbnail_path(obj)
    
    def get_location(self, obj):
        """Return venue address or name as location."""
        if obj.venue:
            return obj.venue.address or obj.venue.name
        return None
    
    def get_revenue(self, obj):
        """Calculate total revenue from sold tickets."""
        try:
            return float(obj.calculate_revenue())
        except Exception:
            return 0.0
    
    def get_commission(self, obj):
        """Calculate commission amount."""
        try:
            return float(obj.calculate_commission())
        except Exception:
            return 0.0
    
    def get_commission_rate(self, obj):
        """Get commission rate from event or organizer."""
        try:
            if obj.commission_rate_value is not None:
                return {
                    'type': obj.commission_rate_type,
                    'value': float(obj.commission_rate_value)
                }
            # Fall back to first organizer's commission_rate
            first_organizer = obj.organizers.first()
            if first_organizer and hasattr(first_organizer, 'commission_rate'):
                return {
                    'type': 'percentage',
                    'value': float(first_organizer.commission_rate * 100)  # Convert decimal to percentage
                }
            return {'type': 'percentage', 'value': 10.0}  # Default 10%
        except Exception:
            return {'type': 'percentage', 'value': 10.0}  # Default 10% on error


class TicketCategoryCreateSerializer(serializers.Serializer):
    """Serializer for creating ticket categories within event creation."""
    name = serializers.CharField(max_length=100, required=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=True, min_value=0)
    total_tickets = serializers.IntegerField(required=True, min_value=0)
    description = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(max_length=7, required=False, allow_blank=True, allow_null=True, default='#10B981')


class EventDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for Event detail view.
    """
    organizer = serializers.SerializerMethodField()
    venue = serializers.SerializerMethodField()
    category = EventCategorySerializer(read_only=True)
    ticket_categories_read = TicketCategorySerializer(many=True, read_only=True, source='ticket_categories')
    ticket_categories = TicketCategoryCreateSerializer(many=True, required=False, allow_empty=True, write_only=True)
    tickets_sold = serializers.IntegerField(read_only=True)
    tickets_available = serializers.IntegerField(read_only=True)
    revenue = serializers.SerializerMethodField()
    commission = serializers.SerializerMethodField()
    commission_rate = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False, allow_null=True, read_only=False)
    venue_layout_image = serializers.ImageField(required=False, allow_null=True, read_only=False)
    venue_layout_image_url = serializers.SerializerMethodField(read_only=True)
    starting_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    deductions = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'artist_name', 'description', 'about_venue', 'gates_open_time', 'closed_doors_time', 'terms_and_conditions',
            'organizer', 'organizers', 'venue', 'date', 'time',
            'category', 'status', 'image', 'venue_layout_image', 'venue_layout_image_url', 'starting_price',
            'total_tickets', 'ticket_limit', 'is_ticket_limit_unlimited',
            'ticket_transfer_enabled', 'tickets_sold', 'tickets_available',
            'ticket_categories', 'ticket_categories_read', 'revenue', 'commission', 'commission_rate',
            'child_eligibility_enabled', 'child_eligibility_rule_type',
            'child_eligibility_min_age', 'child_eligibility_max_age',
            'wheelchair_access', 'bathroom', 'parking', 'non_smoking',
            'deductions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def to_internal_value(self, data):
        """Handle ticket_categories as JSON string from FormData or as list from JSON."""
        import json
        import logging
        logger = logging.getLogger(__name__)
        
        # Handle QueryDict (from FormData) - convert to regular dict
        if hasattr(data, 'getlist'):
            # It's a QueryDict, convert to dict
            data_dict = {}
            for key in data.keys():
                values = data.getlist(key)
                if len(values) == 1:
                    data_dict[key] = values[0]
                else:
                    data_dict[key] = values
            data = data_dict
        
        # Make a mutable copy if needed
        if not isinstance(data, dict):
            data = dict(data) if hasattr(data, '__iter__') else {}
        
        # Normalize boolean fields coming from FormData
        bool_fields = ['is_ticket_limit_unlimited', 'wheelchair_access', 'bathroom', 'parking', 'non_smoking']
        for field in bool_fields:
            if field in data:
                value = data.get(field)
                if isinstance(value, str):
                    data[field] = value.lower() in ['true', '1', 'yes', 'on']
        
        # If ticket_categories is a string (JSON from FormData), parse it
        if 'ticket_categories' in data:
            ticket_categories_value = data.get('ticket_categories')
            logger.info(f"Processing ticket_categories: type={type(ticket_categories_value)}, value={ticket_categories_value}")
            
            if isinstance(ticket_categories_value, str):
                try:
                    parsed = json.loads(ticket_categories_value)
                    logger.info(f"Parsed ticket_categories from JSON string: {parsed}")
                    data['ticket_categories'] = parsed
                except (json.JSONDecodeError, TypeError) as e:
                    logger.error(f"Failed to parse ticket_categories JSON: {e}")
                    # If parsing fails, treat as empty list
                    data['ticket_categories'] = []
            elif isinstance(ticket_categories_value, list):
                # Already a list (from JSON request)
                logger.info(f"ticket_categories already a list: {ticket_categories_value}")
                data['ticket_categories'] = ticket_categories_value
            else:
                # Not a string or list, set to empty list
                logger.warning(f"ticket_categories is unexpected type: {type(ticket_categories_value)}, setting to empty list")
                data['ticket_categories'] = []
        else:
            logger.info("No ticket_categories in data")
        
        return super().to_internal_value(data)
    
    def update(self, instance, validated_data):
        """Update event and ticket categories."""
        ticket_categories_data = validated_data.pop('ticket_categories', None)
        organizers_data = validated_data.pop('organizers', None)
        
        # Update event fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update organizers if provided (even if empty list, to clear existing)
        if organizers_data is not None:
            instance.organizers.set(organizers_data)
        
        # Update ticket categories if provided (even if empty list, to clear existing)
        if ticket_categories_data is not None:
            # Delete existing ticket categories
            TicketCategory.objects.filter(event=instance).delete()
            
            # Create new ticket categories if list is not empty and calculate total_tickets
            total_tickets_sum = 0
            min_price = None
            if isinstance(ticket_categories_data, list) and len(ticket_categories_data) > 0:
                for category_data in ticket_categories_data:
                    try:
                        # Ensure color is set - use default if empty or None
                        if not category_data.get('color') or category_data.get('color', '').strip() == '':
                            category_data['color'] = '#10B981'
                        TicketCategory.objects.create(event=instance, **category_data)
                        
                        # Sum up total tickets from all categories
                        total_tickets_sum += category_data.get('total_tickets', 0)
                        
                        # Track minimum price for starting_price calculation
                        category_price = float(category_data.get('price', 0))
                        if min_price is None or category_price < min_price:
                            min_price = category_price
                    except Exception as e:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Error creating ticket category: {e}, data: {category_data}")
                        raise
                
                # Auto-calculate total_tickets from sum of all category tickets
                if total_tickets_sum > 0:
                    instance.total_tickets = total_tickets_sum
                    instance.save(update_fields=['total_tickets'])
                    logger.info(f"Auto-calculated total_tickets to {total_tickets_sum} from ticket categories")
                
                # Update starting_price to the lowest ticket category price
                if min_price is not None:
                    instance.starting_price = min_price
                    instance.save(update_fields=['starting_price'])
            else:
                # No categories, set total_tickets to 0
                instance.total_tickets = 0
                instance.save(update_fields=['total_tickets'])
        
        return instance
    
    def get_venue_layout_image_url(self, obj):
        """Get venue layout image URL."""
        if obj.venue_layout_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.venue_layout_image.url)
            return obj.venue_layout_image.url if hasattr(obj.venue_layout_image, 'url') else str(obj.venue_layout_image)
        return None
    
    def get_organizer(self, obj):
        """Return list of organizers."""
        organizers = obj.organizers.all()
        if organizers.exists():
            return [
                {
                    'id': org.id,
                    'name': org.name,
                    'email': org.email if hasattr(org, 'email') else None
                }
                for org in organizers
            ]
        return []
    
    def get_venue(self, obj):
        if obj.venue:
            return {
                'id': obj.venue.id,
                'name': obj.venue.name,
                'address': obj.venue.address,
                'city': obj.venue.city,
                'capacity': obj.venue.capacity
            }
        return None
    
    def get_revenue(self, obj):
        return float(obj.calculate_revenue())
    
    def get_commission(self, obj):
        return float(obj.calculate_commission())
    
    def get_commission_rate(self, obj):
        """Get commission rate from event or organizer."""
        if obj.commission_rate_value is not None:
            return {
                'type': obj.commission_rate_type,
                'value': float(obj.commission_rate_value)
            }
        # Fall back to first organizer's commission_rate
        first_organizer = obj.organizers.first()
        if first_organizer and hasattr(first_organizer, 'commission_rate'):
            return {
                'type': 'percentage',
                'value': float(first_organizer.commission_rate * 100)  # Convert decimal to percentage
            }
            return {'type': 'percentage', 'value': 10.0}  # Default 10%
    
    def get_deductions(self, obj):
        """Get deductions with appliesTo field properly mapped."""
        from finances.serializers import DeductionSerializer
        deductions = obj.deductions.all()
        if deductions.exists():
            return DeductionSerializer(deductions, many=True).data
        return []


class EventCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating events.
    """
    ticket_categories = TicketCategoryCreateSerializer(many=True, required=False, allow_empty=True)
    category = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'artist_name', 'description', 'about_venue', 'gates_open_time', 'closed_doors_time', 'terms_and_conditions',
            'organizers', 'venue', 'date', 'time',
            'category', 'status', 'image', 'venue_layout_image', 'starting_price',
            'total_tickets', 'ticket_limit', 'is_ticket_limit_unlimited',
            'ticket_transfer_enabled', 'transfer_fee_type', 'transfer_fee_value',
            'commission_rate_type', 'commission_rate_value',
            'child_eligibility_enabled', 'child_eligibility_rule_type',
            'child_eligibility_min_age', 'child_eligibility_max_age',
            'wheelchair_access', 'bathroom', 'parking', 'non_smoking',
            'ticket_categories', 'created_at', 'updated_at'
            # Note: 'deductions' is NOT in fields list - handled manually in to_internal_value and create methods
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'total_tickets': {'required': False, 'allow_null': True},
            'ticket_limit': {'required': False},
        }
    
    def to_internal_value(self, data):
        """Handle ticket_categories as JSON string from FormData and category validation."""
        import json
        import logging
        logger = logging.getLogger(__name__)
        
        # Handle QueryDict (from FormData) - convert to regular dict
        if hasattr(data, 'getlist'):
            # It's a QueryDict, convert to dict
            data_dict = {}
            for key in data.keys():
                values = data.getlist(key)
                # For organizers, always keep as list (even if single value)
                if key == 'organizers':
                    data_dict[key] = values
                elif len(values) == 1:
                    data_dict[key] = values[0]
                else:
                    data_dict[key] = values
            data = data_dict
        
        # Make a mutable copy if needed
        if not isinstance(data, dict):
            data = dict(data) if hasattr(data, '__iter__') else {}
        
        # Handle category - accept category name (string) and convert to category object
        # Category name will be processed in create/update methods
        if 'category' in data:
            category_value = data.get('category')
            if category_value is None or (isinstance(category_value, str) and category_value.strip() == ''):
                # Empty category - set to None
                data['category'] = None
            elif isinstance(category_value, (int, str)):
                # Keep as string - will be processed in create/update
                # If it's a number string, try to convert to category name
                try:
                    category_id = int(category_value)
                    category_obj = EventCategory.objects.filter(pk=category_id).first()
                    if category_obj:
                        data['category'] = category_obj.name
                except (ValueError, TypeError):
                    # It's already a name string, keep it
                    pass
        
        # Handle organizers - ensure it's always a list (can be one or multiple)
        if 'organizers' in data:
            organizers_value = data.get('organizers')
            logger.info(f"Processing organizers: type={type(organizers_value)}, value={organizers_value}")
            
            if isinstance(organizers_value, str):
                # Single organizer as string - convert to list
                try:
                    # Try to parse as integer ID
                    organizer_id = int(organizers_value)
                    data['organizers'] = [organizer_id]
                except (ValueError, TypeError):
                    # If not a number, treat as empty list
                    logger.warning(f"Invalid organizer ID format: {organizers_value}")
                    data['organizers'] = []
            elif isinstance(organizers_value, list):
                # Already a list - ensure all values are integers
                try:
                    data['organizers'] = [int(org_id) for org_id in organizers_value if org_id]
                except (ValueError, TypeError) as e:
                    logger.error(f"Error converting organizer IDs to integers: {e}")
                    data['organizers'] = []
            elif organizers_value is None:
                data['organizers'] = []
            else:
                logger.warning(f"organizers is unexpected type: {type(organizers_value)}, setting to empty list")
                data['organizers'] = []
        else:
            logger.info("No organizers in data")
            data['organizers'] = []
        
        # Normalize boolean fields from FormData strings
        bool_fields = ['is_ticket_limit_unlimited', 'child_eligibility_enabled', 'ticket_transfer_enabled', 'wheelchair_access', 'bathroom', 'parking', 'non_smoking']
        for field in bool_fields:
            if field in data:
                value = data.get(field)
                if isinstance(value, str):
                    data[field] = value.lower() in ['true', '1', 'yes', 'on']
                elif isinstance(value, list) and len(value) > 0:
                    # Handle case where FormData creates an array (shouldn't happen, but handle it)
                    value_str = str(value[0])
                    data[field] = value_str.lower() in ['true', '1', 'yes', 'on']

        # If ticket_categories is a string (JSON from FormData), parse it
        if 'ticket_categories' in data:
            ticket_categories_value = data.get('ticket_categories')
            logger.info(f"Processing ticket_categories: type={type(ticket_categories_value)}, value={ticket_categories_value}")
            
            if isinstance(ticket_categories_value, str):
                try:
                    parsed = json.loads(ticket_categories_value)
                    logger.info(f"Parsed ticket_categories from JSON string: {parsed}")
                    data['ticket_categories'] = parsed
                except (json.JSONDecodeError, TypeError) as e:
                    logger.error(f"Failed to parse ticket_categories JSON: {e}")
                    # If parsing fails, treat as empty list
                    data['ticket_categories'] = []
            elif isinstance(ticket_categories_value, list):
                # Already a list (from JSON request)
                logger.info(f"ticket_categories already a list: {ticket_categories_value}")
                data['ticket_categories'] = ticket_categories_value
            else:
                # Not a string or list, set to empty list
                logger.warning(f"ticket_categories is unexpected type: {type(ticket_categories_value)}, setting to empty list")
                data['ticket_categories'] = []
        else:
            logger.info("No ticket_categories in data")
        
        # Handle deductions - similar to ticket_categories
        if 'deductions' in data:
            deductions_value = data.get('deductions')
            logger.info(f"Processing deductions: type={type(deductions_value)}, value={deductions_value}")
            
            if isinstance(deductions_value, str):
                try:
                    parsed = json.loads(deductions_value)
                    logger.info(f"Parsed deductions from JSON string: {parsed}")
                    data['deductions'] = parsed
                except (json.JSONDecodeError, TypeError) as e:
                    logger.error(f"Failed to parse deductions JSON: {e}")
                    data['deductions'] = []
            elif isinstance(deductions_value, list):
                logger.info(f"deductions already a list: {deductions_value}")
                data['deductions'] = deductions_value
            else:
                logger.warning(f"deductions is unexpected type: {type(deductions_value)}, setting to empty list")
                data['deductions'] = []
        else:
            logger.info("No deductions in data")
            data['deductions'] = []
        
        # Store deductions separately since it's not in fields list (to avoid ManyToMany validation)
        deductions_data = data.pop('deductions', [])
        
        # Call super to validate other fields
        validated_data = super().to_internal_value(data)
        
        # Add deductions back to validated_data so create method can access it
        validated_data['deductions'] = deductions_data
        
        return validated_data
    
    def validate_date(self, value):
        from django.utils import timezone
        # Only validate date for new events (create), not updates
        # For updates, allow past dates since events might have already occurred
        if self.instance is None and value < timezone.now().date():
            raise serializers.ValidationError('Event date cannot be in the past.')
        return value
    
    def validate_total_tickets(self, value):
        if value is None:
            # Allow None/empty, will be calculated from ticket categories
            return 0
        if value < 0:
            raise serializers.ValidationError('Total tickets cannot be negative.')
        return value
    
    def validate_ticket_limit(self, value):
        if value is None or value < 1:
            # Ensure ticket_limit is at least 1
            return 1
        return value
    
    def create(self, validated_data):
        """Create event and associated ticket categories."""
        import logging
        logger = logging.getLogger(__name__)
        
        # Pop these fields before validation to avoid ManyToMany validation errors
        ticket_categories_data = validated_data.pop('ticket_categories', [])
        organizers_data = validated_data.pop('organizers', [])
        deductions_data = validated_data.pop('deductions', [])
        logger.info(f"Creating event with ticket_categories: {ticket_categories_data}, organizers: {organizers_data}, deductions: {deductions_data}")
        
        # Handle category - get or create by name
        category_name = validated_data.pop('category', None)
        category_obj = None
        if category_name and isinstance(category_name, str) and category_name.strip():
            category_obj, created = EventCategory.objects.get_or_create(
                name=category_name.strip(),
                defaults={'description': ''}
            )
            logger.info(f"Category: {category_obj.name} ({'created' if created else 'existing'})")
        
        validated_data['category'] = category_obj
        
        # Ensure total_tickets is set (default to 0 if not provided, will be calculated from categories)
        if 'total_tickets' not in validated_data or validated_data.get('total_tickets') is None:
            validated_data['total_tickets'] = 0
        
        # Ensure ticket limit honours unlimited flag
        # When unlimited, ticket_limit should be at least 1 (backend validation requires >= 1)
        if validated_data.get('is_ticket_limit_unlimited'):
            total_tickets = validated_data.get('total_tickets') or validated_data.get('ticket_limit')
            if total_tickets and total_tickets > 0:
                validated_data['ticket_limit'] = total_tickets
            elif validated_data.get('ticket_limit', 0) < 1:
                # Ensure ticket_limit is at least 1 even when unlimited
                validated_data['ticket_limit'] = 1
        else:
            # Ensure ticket_limit is at least 1 even when not unlimited
            if validated_data.get('ticket_limit', 0) < 1:
                validated_data['ticket_limit'] = 1

        # Create the event
        event = Event.objects.create(**validated_data)
        logger.info(f"Created event: {event.id} - {event.title}")
        
        # Set organizers (ManyToManyField)
        if organizers_data:
            event.organizers.set(organizers_data)
        
        # Create ticket categories and calculate total_tickets
        total_tickets_sum = 0
        if isinstance(ticket_categories_data, list) and len(ticket_categories_data) > 0:
            min_price = None
            for category_data in ticket_categories_data:
                try:
                    # Skip categories with blank names
                    if not category_data.get('name') or not category_data.get('name', '').strip():
                        logger.warning(f"Skipping ticket category with blank name: {category_data}")
                        continue
                    
                    # Ensure color is set - use default if empty or None
                    if not category_data.get('color') or category_data.get('color', '').strip() == '':
                        category_data['color'] = '#10B981'
                    TicketCategory.objects.create(event=event, **category_data)
                    logger.info(f"Created ticket category: {category_data.get('name')} with color {category_data.get('color')} for event {event.id}")
                    
                    # Sum up total tickets from all categories
                    total_tickets_sum += category_data.get('total_tickets', 0)
                    
                    # Track minimum price for starting_price calculation
                    category_price = float(category_data.get('price', 0))
                    if min_price is None or category_price < min_price:
                        min_price = category_price
                except Exception as e:
                    logger.error(f"Error creating ticket category: {e}, data: {category_data}")
                    raise
            
            # Auto-calculate total_tickets from sum of all category tickets
            if total_tickets_sum > 0:
                event.total_tickets = total_tickets_sum
                event.save(update_fields=['total_tickets'])
                logger.info(f"Auto-calculated total_tickets to {total_tickets_sum} from ticket categories")
            
            # Set starting_price to the lowest ticket category price
            if min_price is not None:
                event.starting_price = min_price
                event.save(update_fields=['starting_price'])
                logger.info(f"Set starting_price to {min_price} (lowest ticket category price)")
        else:
            logger.info(f"No ticket categories to create (data: {ticket_categories_data})")
        
        # Handle deductions - create or get Deduction objects and associate with event
        if isinstance(deductions_data, list) and len(deductions_data) > 0:
            from finances.models import Deduction
            deduction_objects = []
            request = self.context.get('request') if self.context else None
            user = request.user if request and hasattr(request, 'user') and request.user.is_authenticated else None
            
            for deduction_data in deductions_data:
                try:
                    # Skip if name is empty
                    if not deduction_data.get('name') or not deduction_data.get('name', '').strip():
                        logger.warning(f"Skipping deduction with blank name: {deduction_data}")
                        continue
                    
                    # Create or get deduction
                    deduction, created = Deduction.objects.get_or_create(
                        name=deduction_data.get('name', '').strip(),
                        type=deduction_data.get('type', 'percentage'),
                        applies_to=deduction_data.get('appliesTo', 'tickets'),
                        defaults={
                            'value': deduction_data.get('value', 0),
                            'description': deduction_data.get('description', ''),
                            'is_active': True,
                            'created_by': user,
                        }
                    )
                    # Update value, description, and applies_to if deduction already exists
                    if not created:
                        deduction.value = deduction_data.get('value', deduction.value)
                        deduction.description = deduction_data.get('description', deduction.description)
                        deduction.applies_to = deduction_data.get('appliesTo', deduction.applies_to)
                        deduction.is_active = True
                        deduction.save()
                    deduction_objects.append(deduction)
                    logger.info(f"{'Created' if created else 'Found'} deduction: {deduction.name} for event {event.id}")
                except Exception as e:
                    logger.error(f"Error creating/getting deduction: {e}, data: {deduction_data}", exc_info=True)
                    # Continue processing other deductions even if one fails
            
            # Associate deductions with event
            if deduction_objects:
                try:
                    event.deductions.set(deduction_objects)
                    logger.info(f"Associated {len(deduction_objects)} deductions with event {event.id}")
                except Exception as e:
                    logger.error(f"Error associating deductions with event: {e}", exc_info=True)
                    # Don't fail the entire event creation if deductions association fails
                logger.info(f"Associated {len(deduction_objects)} deductions with event {event.id}")
        else:
            # Clear deductions if empty list
            event.deductions.clear()
            logger.info(f"No deductions to associate (data: {deductions_data})")
        
        return event
    
    def update(self, instance, validated_data):
        """Update event and ticket categories."""
        ticket_categories_data = validated_data.pop('ticket_categories', None)
        organizers_data = validated_data.pop('organizers', None)
        deductions_data = validated_data.pop('deductions', None)
        
        # Handle category - get or create by name
        category_name = validated_data.pop('category', None)
        if category_name is not None:
            if isinstance(category_name, str) and category_name.strip():
                category_obj, created = EventCategory.objects.get_or_create(
                    name=category_name.strip(),
                    defaults={'description': ''}
                )
                validated_data['category'] = category_obj
            else:
                # Empty string or None - set category to None
                validated_data['category'] = None
        
        # Ensure ticket limit honours unlimited flag
        is_unlimited = validated_data.get('is_ticket_limit_unlimited', instance.is_ticket_limit_unlimited)
        if is_unlimited:
            total_tickets = validated_data.get('total_tickets', instance.total_tickets)
            if total_tickets:
                validated_data['ticket_limit'] = total_tickets

        # Handle file replacements - delete old files before saving new ones
        if 'venue_layout_image' in validated_data and validated_data['venue_layout_image']:
            # Delete old venue layout image if it exists
            if instance.venue_layout_image:
                try:
                    instance.venue_layout_image.delete(save=False)
                except Exception:
                    pass  # Ignore errors if file doesn't exist
        
        if 'image' in validated_data and validated_data['image']:
            # Delete old main image if it exists
            if instance.image:
                try:
                    instance.image.delete(save=False)
                except Exception:
                    pass  # Ignore errors if file doesn't exist

        # Update event fields
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Updating event {instance.id}. Validated data keys: {list(validated_data.keys())}")
        if 'venue_layout_image' in validated_data:
            logger.info(f"venue_layout_image in validated_data: {type(validated_data['venue_layout_image'])}")
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Verify venue_layout_image was saved
        instance.refresh_from_db()
        logger.info(f"After save, venue_layout_image exists: {bool(instance.venue_layout_image)}")
        
        # Update organizers if provided (even if empty list, to clear existing)
        if organizers_data is not None:
            instance.organizers.set(organizers_data)
        
        # Update deductions if provided (even if empty list, to clear existing)
        if deductions_data is not None:
            from finances.models import Deduction
            if isinstance(deductions_data, list) and len(deductions_data) > 0:
                deduction_objects = []
                for deduction_data in deductions_data:
                    try:
                        # Create or get deduction
                        deduction, created = Deduction.objects.get_or_create(
                            name=deduction_data.get('name', '').strip(),
                            type=deduction_data.get('type', 'percentage'),
                            defaults={
                                'value': deduction_data.get('value', 0),
                                'description': deduction_data.get('description', ''),
                                'is_active': True,
                                'created_by': self.context.get('request').user if self.context.get('request') else None,
                            }
                        )
                        # Update value and description if deduction already exists
                        if not created:
                            deduction.value = deduction_data.get('value', deduction.value)
                            deduction.description = deduction_data.get('description', deduction.description)
                            deduction.is_active = True
                            deduction.save()
                        deduction_objects.append(deduction)
                        logger.info(f"{'Created' if created else 'Found'} deduction: {deduction.name} for event {instance.id}")
                    except Exception as e:
                        logger.error(f"Error creating/getting deduction: {e}, data: {deduction_data}")
                
                # Associate deductions with event
                instance.deductions.set(deduction_objects)
                logger.info(f"Associated {len(deduction_objects)} deductions with event {instance.id}")
            else:
                # Clear deductions if empty list
                instance.deductions.clear()
                logger.info(f"Cleared deductions for event {instance.id}")
        
        # Update ticket categories if provided (even if empty list, to clear existing)
        if ticket_categories_data is not None:
            # Delete existing ticket categories
            TicketCategory.objects.filter(event=instance).delete()
            
            # Create new ticket categories if list is not empty and calculate total_tickets
            total_tickets_sum = 0
            min_price = None
            if isinstance(ticket_categories_data, list) and len(ticket_categories_data) > 0:
                for category_data in ticket_categories_data:
                    try:
                        # Ensure color is set - use default if empty or None
                        if not category_data.get('color') or category_data.get('color', '').strip() == '':
                            category_data['color'] = '#10B981'
                        TicketCategory.objects.create(event=instance, **category_data)
                        
                        # Sum up total tickets from all categories
                        total_tickets_sum += category_data.get('total_tickets', 0)
                        
                        # Track minimum price for starting_price calculation
                        category_price = float(category_data.get('price', 0))
                        if min_price is None or category_price < min_price:
                            min_price = category_price
                    except Exception as e:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.error(f"Error creating ticket category: {e}, data: {category_data}")
                        raise
                
                # Auto-calculate total_tickets from sum of all category tickets
                if total_tickets_sum > 0:
                    instance.total_tickets = total_tickets_sum
                    instance.save(update_fields=['total_tickets'])
                    logger.info(f"Auto-calculated total_tickets to {total_tickets_sum} from ticket categories")
                
                # Update starting_price to the lowest ticket category price
                if min_price is not None:
                    instance.starting_price = min_price
                    instance.save(update_fields=['starting_price'])
            else:
                # No categories, set total_tickets to 0
                instance.total_tickets = 0
                instance.save(update_fields=['total_tickets'])
        
        return instance

