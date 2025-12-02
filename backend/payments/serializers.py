"""
Serializers for payments app.
"""
import json
from rest_framework import serializers
from .models import PaymentTransaction
from events.models import Event


class PaymentTransactionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    ticket_number = serializers.SerializerMethodField()
    ticket_category = serializers.SerializerMethodField()
    event_title = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'customer', 'customer_name', 'customer_email', 'customer_phone',
            'ticket', 'ticket_number', 'ticket_category', 'event_title', 'amount', 'payment_method',
            'status', 'transaction_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'customer', 'ticket', 'created_at', 'updated_at']
    
    def get_ticket_number(self, obj):
        """Get ticket number from ticket if available, otherwise return None."""
        if obj.ticket and obj.ticket.ticket_number:
            return obj.ticket.ticket_number
        return None
    
    def get_ticket_category(self, obj):
        """Get ticket category/type from ticket if available."""
        if obj.ticket and obj.ticket.category:
            return obj.ticket.category
        # Try to get from payment_gateway_response if ticket not available
        if obj.payment_gateway_response:
            try:
                gateway_response = json.loads(obj.payment_gateway_response)
                booking_data = gateway_response.get('booking_data', {})
                category = booking_data.get('category')
                if category:
                    return category
            except (json.JSONDecodeError, KeyError, TypeError):
                pass
        return None
    
    def get_event_title(self, obj):
        """Get event title from ticket if available, otherwise from payment_gateway_response."""
        # First try to get from ticket
        if obj.ticket and obj.ticket.event:
            return obj.ticket.event.title
        
        # If no ticket, try to get from payment_gateway_response
        if obj.payment_gateway_response:
            try:
                gateway_response = json.loads(obj.payment_gateway_response)
                event_id = gateway_response.get('event_id')
                if event_id:
                    try:
                        event = Event.objects.get(id=event_id)
                        return event.title
                    except Event.DoesNotExist:
                        pass
            except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                pass
        
        return None

