"""
Views for tickets app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from core.permissions import IsAdmin, IsUsher
from core.exceptions import PermissionDenied, NotFoundError, ValidationError
from core.utils import get_client_ip, log_system_action
from .models import Ticket, TicketTransfer
from .serializers import (
    TicketListSerializer,
    TicketDetailSerializer,
    TicketStatusUpdateSerializer,
    TicketCheckinSerializer,
    TicketTransferSerializer
)
from .filters import TicketFilter


class TicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Ticket model.
    """
    queryset = Ticket.objects.select_related('event', 'customer').all()
    permission_classes = [IsAuthenticated]
    filterset_class = TicketFilter
    search_fields = ['ticket_number', 'event__title', 'customer__name']
    ordering_fields = ['purchase_date', 'ticket_number']
    ordering = ['-purchase_date']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TicketListSerializer
        return TicketDetailSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'status']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        """
        Create a new ticket (admin only).
        POST /api/tickets/
        """
        from events.models import Event
        from customers.models import Customer
        from payments.models import PaymentTransaction
        from decimal import Decimal
        import uuid
        
        event_id = request.data.get('event_id')
        customer_id = request.data.get('customer_id')
        category = request.data.get('category')
        price = request.data.get('price', 0)
        paid_outside_system = request.data.get('paid_outside_system', False)
        
        if not all([event_id, customer_id, category]):
            return Response({
                'error': {'code': 'VALIDATION_ERROR', 'message': 'event_id, customer_id, and category are required.'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Price is required unless paid outside system
        if not paid_outside_system and (price is None or price == 0):
            return Response({
                'error': {'code': 'VALIDATION_ERROR', 'message': 'price is required unless paid_outside_system is true.'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            event = Event.objects.get(id=event_id)
            customer = Customer.objects.get(id=customer_id)
        except Event.DoesNotExist:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Event not found.'}
            }, status=status.HTTP_404_NOT_FOUND)
        except Customer.DoesNotExist:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Customer not found.'}
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Generate unique ticket number
        ticket_number = f"{event.id}-{customer.id}-{uuid.uuid4().hex[:8]}"
        
        # Create ticket
        ticket = Ticket.objects.create(
            event=event,
            customer=customer,
            buyer=customer,  # Set buyer to customer (who received the ticket)
            category=category,
            price=Decimal(str(price)) if price else Decimal('0'),
            status='valid',
            ticket_number=ticket_number
        )
        
        # Create payment transaction if not paid outside system
        # This ensures payment_status shows as 'completed'
        try:
            if not paid_outside_system and price and Decimal(str(price)) > 0:
                PaymentTransaction.objects.create(
                    customer=customer,
                    ticket=ticket,
                    amount=Decimal(str(price)),
                    payment_method='admin_assigned',  # Mark as admin-assigned
                    status='completed',
                    transaction_id=f"ADMIN-{uuid.uuid4().hex[:16]}"
                )
            elif paid_outside_system:
                # Even if paid outside system, create a transaction to mark as completed
                # This ensures the ticket shows as paid
                PaymentTransaction.objects.create(
                    customer=customer,
                    ticket=ticket,
                    amount=Decimal(str(price)) if price else Decimal('0'),
                    payment_method='paid_outside_system',
                    status='completed',
                    transaction_id=f"OUTSIDE-{uuid.uuid4().hex[:16]}"
                )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating payment transaction for ticket {ticket.id}: {str(e)}", exc_info=True)
            # Don't fail the ticket creation if payment transaction creation fails
            # The serializer will still show payment_status as 'completed' due to the fallback logic
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='CREATE_TICKET',
            category='ticket',
            severity='INFO',
            description=f'Created ticket {ticket.ticket_number} for event {event.title}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response(TicketListSerializer(ticket).data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """
        Update ticket (admin only).
        PUT /api/tickets/:id/
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Only allow updating status, category, and price
        allowed_fields = ['status', 'category', 'price']
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        
        if 'status' in data:
            old_status = instance.status
            instance.status = data['status']
            if instance.status == 'used' and old_status == 'valid':
                instance.check_in_time = timezone.now()
        
        if 'category' in data:
            instance.category = data['category']
        
        if 'price' in data:
            instance.price = data['price']
        
        instance.save()
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='UPDATE_TICKET',
            category='ticket',
            severity='INFO',
            description=f'Updated ticket {instance.ticket_number}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response(TicketDetailSerializer(instance).data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete ticket (admin only).
        DELETE /api/tickets/:id/
        """
        instance = self.get_object()
        ticket_number = instance.ticket_number
        
        # Log system action before deletion
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='DELETE_TICKET',
            category='ticket',
            severity='INFO',
            description=f'Deleted ticket {ticket_number}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    def list(self, request, *args, **kwargs):
        """
        List all tickets with filtering and pagination.
        GET /api/tickets/
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve ticket details.
        GET /api/tickets/:id/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=['put'], permission_classes=[IsAuthenticated, IsAdmin])
    def status(self, request, pk=None):
        """
        Update ticket status.
        PUT /api/tickets/:id/status/
        """
        ticket = self.get_object()
        serializer = TicketStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_status = ticket.status
        ticket.status = serializer.validated_data['status']
        
        if ticket.status == 'used' and old_status == 'valid':
            ticket.check_in_time = timezone.now()
        
        ticket.save()
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='UPDATE_TICKET_STATUS',
            category='ticket',
            severity='INFO',
            description=f'Updated ticket {ticket.ticket_number} status from {old_status} to {ticket.status}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response(TicketDetailSerializer(ticket).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsUsher])
    def checkin(self, request, pk=None):
        """
        Check in a ticket.
        POST /api/tickets/:id/checkin/
        """
        ticket = self.get_object()
        
        if ticket.status != 'valid':
            raise ValidationError('Only valid tickets can be checked in.')
        
        serializer = TicketCheckinSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Mark ticket as used
        ticket.mark_as_used()
        
        # Create check-in log
        from system.models import CheckinLog
        CheckinLog.objects.create(
            timestamp=timezone.now(),
            customer=ticket.customer,
            customer_email=ticket.customer.email,
            event=ticket.event,
            event_title=ticket.event.title,
            venue=ticket.event.venue,
            nfc_card=None,  # Will be set if provided
            scan_result='success',
            scan_type='manual',
            device_name=serializer.validated_data.get('device_name', ''),
            device_type=serializer.validated_data.get('device_type', ''),
            operator=request.user,
            operator_role=request.user.role if hasattr(request.user, 'role') else '',
            notes=serializer.validated_data.get('notes', '')
        )
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='TICKET_CHECKIN',
            category='ticket',
            severity='INFO',
            description=f'Checked in ticket {ticket.ticket_number}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response({
            'message': 'Ticket checked in successfully',
            'ticket': TicketDetailSerializer(ticket).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def transfer(self, request, pk=None):
        """
        Transfer ticket to another customer.
        POST /api/tickets/:id/transfer/
        """
        ticket = self.get_object()
        
        if not ticket.event.ticket_transfer_enabled:
            raise ValidationError('Ticket transfers are not enabled for this event.')
        
        if ticket.status != 'valid':
            raise ValidationError('Only valid tickets can be transferred.')
        
        to_customer_id = request.data.get('to_customer_id')
        if not to_customer_id:
            raise ValidationError('to_customer_id is required.')
        
        from customers.models import Customer
        try:
            to_customer = Customer.objects.get(id=to_customer_id)
        except Customer.DoesNotExist:
            raise NotFoundError('Customer not found.')
        
        # Check if user has permission (customer can only transfer their own tickets)
        if request.user.role not in ['ADMIN', 'SUPER_ADMIN']:
            if ticket.customer.user != request.user:
                raise PermissionDenied('You can only transfer your own tickets.')
        
        # Create transfer record
        transfer = TicketTransfer.objects.create(
            ticket=ticket,
            from_customer=ticket.customer,
            to_customer=to_customer,
            status='completed'
        )
        
        # Update ticket customer
        ticket.customer = to_customer
        ticket.save()
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='TICKET_TRANSFER',
            category='ticket',
            severity='INFO',
            description=f'Transferred ticket {ticket.ticket_number} to {to_customer.name}',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response({
            'message': 'Ticket transferred successfully',
            'transfer': TicketTransferSerializer(transfer).data,
            'ticket': TicketDetailSerializer(ticket).data
        })
