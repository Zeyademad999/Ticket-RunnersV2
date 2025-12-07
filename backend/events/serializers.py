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
            'created_at', 'updated_at'
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
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
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
                if len(values) == 1:
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
        
        return super().to_internal_value(data)
    
    def validate_date(self, value):
        from django.utils import timezone
        # Only validate date for new events (create), not updates
        # For updates, allow past dates since events might have already occurred
        if self.instance is None and value < timezone.now().date():
            raise serializers.ValidationError('Event date cannot be in the past.')
        return value
    
    def validate_total_tickets(self, value):
        if value < 0:
            raise serializers.ValidationError('Total tickets cannot be negative.')
        return value
    
    def create(self, validated_data):
        """Create event and associated ticket categories."""
        import logging
        logger = logging.getLogger(__name__)
        
        ticket_categories_data = validated_data.pop('ticket_categories', [])
        organizers_data = validated_data.pop('organizers', [])
        logger.info(f"Creating event with ticket_categories: {ticket_categories_data}, organizers: {organizers_data}")
        
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
        
        # Ensure ticket limit honours unlimited flag
        if validated_data.get('is_ticket_limit_unlimited'):
            total_tickets = validated_data.get('total_tickets') or validated_data.get('ticket_limit')
            if total_tickets:
                validated_data['ticket_limit'] = total_tickets

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
        
        return event
    
    def update(self, instance, validated_data):
        """Update event and ticket categories."""
        ticket_categories_data = validated_data.pop('ticket_categories', None)
        organizers_data = validated_data.pop('organizers', None)
        
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

