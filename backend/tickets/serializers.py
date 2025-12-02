"""
Serializers for tickets app.
"""
from rest_framework import serializers
from .models import Ticket, TicketTransfer


class TicketListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for Ticket list view.
    """
    event_title = serializers.CharField(source='event.title', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_id = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    is_assigned = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'event_title', 'customer_name', 'customer_id', 'customer_phone',
            'category', 'price', 'purchase_date', 'status', 'ticket_number', 'dependents', 
            'payment_status', 'is_assigned', 'assigned_name', 'assigned_mobile', 'assigned_email'
        ]
        read_only_fields = ['id', 'purchase_date']
    
    def get_customer_id(self, obj):
        """Get customer ID as string"""
        return str(obj.customer.id) if obj.customer else ''
    
    def get_customer_phone(self, obj):
        """Get customer phone number (phone or mobile_number)"""
        if not obj.customer:
            return ''
        return obj.customer.phone or obj.customer.mobile_number or ''
    
    def get_payment_status(self, obj):
        """Get payment status for this ticket"""
        from payments.models import PaymentTransaction
        payment = PaymentTransaction.objects.filter(ticket=obj).order_by('-created_at').first()
        if payment:
            return payment.status
        # If no payment transaction exists but ticket exists, it means payment was made
        # (either through system payment that wasn't recorded, or paid outside system)
        # Default to 'completed' since ticket cannot exist without payment
        if obj.customer and obj.buyer:
            return 'completed'
        # If ticket has a customer, they paid for it
        if obj.customer:
            return 'completed'
        return None
    
    def get_is_assigned(self, obj):
        """Check if ticket was assigned to someone else"""
        return bool(obj.assigned_name or obj.assigned_mobile or obj.assigned_email)


class TicketDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for Ticket detail view.
    """
    event = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            'id', 'event', 'customer', 'category', 'price', 'purchase_date',
            'status', 'check_in_time', 'dependents', 'ticket_number', 'created_at'
        ]
        read_only_fields = ['id', 'purchase_date', 'created_at']
    
    def get_event(self, obj):
        return {
            'id': obj.event.id,
            'title': obj.event.title,
            'date': obj.event.date,
            'time': obj.event.time
        }
    
    def get_customer(self, obj):
        return {
            'id': str(obj.customer.id),
            'name': obj.customer.name,
            'email': obj.customer.email,
            'phone': obj.customer.phone or '',
            'mobile_number': obj.customer.mobile_number or '',
        }


class TicketStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating ticket status.
    """
    status = serializers.ChoiceField(choices=Ticket.STATUS_CHOICES)


class TicketCheckinSerializer(serializers.Serializer):
    """
    Serializer for ticket check-in.
    """
    nfc_card = serializers.CharField(required=False, allow_blank=True)
    device_name = serializers.CharField(required=False, allow_blank=True)
    device_type = serializers.CharField(required=False, allow_blank=True)
    operator_role = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class TicketTransferSerializer(serializers.ModelSerializer):
    """
    Serializer for ticket transfer.
    """
    class Meta:
        model = TicketTransfer
        fields = ['id', 'ticket', 'from_customer', 'to_customer', 'transfer_date', 'status']
        read_only_fields = ['id', 'transfer_date']

