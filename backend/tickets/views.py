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
        Supports assigning tickets to customers by phone number (assigned_mobile).
        """
        from events.models import Event
        from customers.models import Customer
        from payments.models import PaymentTransaction
        from tickets.models import TicketRegistrationToken
        from decimal import Decimal
        import uuid
        import logging
        logger = logging.getLogger(__name__)
        
        event_id = request.data.get('event_id')
        customer_id = request.data.get('customer_id')
        category = request.data.get('category')
        price = request.data.get('price', 0)
        paid_outside_system = request.data.get('paid_outside_system', False)
        assigned_mobile = request.data.get('assigned_mobile')
        assigned_email = request.data.get('assigned_email')
        
        if not all([event_id, category]):
            return Response({
                'error': {'code': 'VALIDATION_ERROR', 'message': 'event_id and category are required.'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Either customer_id or assigned_mobile must be provided
        if not customer_id and not assigned_mobile:
            return Response({
                'error': {'code': 'VALIDATION_ERROR', 'message': 'Either customer_id or assigned_mobile is required.'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Price is required unless paid outside system
        if not paid_outside_system and (price is None or price == 0):
            return Response({
                'error': {'code': 'VALIDATION_ERROR', 'message': 'price is required unless paid_outside_system is true.'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Event not found.'}
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Determine the customer - either from customer_id or by phone number
        customer = None
        assigned_customer = None
        
        # If assigned_mobile is provided, normalize it and find customer by phone number
        if assigned_mobile:
            assigned_mobile = assigned_mobile.strip()
            
            # Normalize the phone number (handle all formats)
            from apps.webapp.views import normalize_mobile_number, find_customer_by_phone
            normalized_mobile = normalize_mobile_number(assigned_mobile)
            
            # Use normalized phone number for customer lookup and ticket assignment
            assigned_mobile = normalized_mobile
            
            # Find customer using the comprehensive search function
            assigned_customer = find_customer_by_phone(assigned_mobile)
            
            # If customer found, ensure it's active
            if assigned_customer and assigned_customer.status != 'active':
                assigned_customer = None
        
        # If customer_id is provided, get that customer
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                return Response({
                    'error': {'code': 'NOT_FOUND', 'message': 'Customer not found.'}
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Determine ticket owner:
        # 1. If assigned_customer found (by phone), use them
        # 2. Otherwise, use customer from customer_id
        # 3. If neither exists, we need at least customer_id
        ticket_owner = assigned_customer or customer
        
        # If no customer found, we need customer_id
        if not ticket_owner:
            return Response({
                'error': {'code': 'VALIDATION_ERROR', 'message': 'Customer not found. Please provide a valid customer_id or ensure the phone number matches an existing customer.'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine buyer: 
        # - If ticket is assigned (assigned_mobile provided), buyer is the admin's customer profile
        # - Otherwise, buyer is the ticket owner
        # This ensures admin-assigned tickets show "System Admin" as the buyer
        if assigned_mobile:
            # Admin is assigning ticket - get admin's customer profile as buyer
            admin_customer_profile = None
            if hasattr(request.user, 'customer_profile') and request.user.customer_profile:
                admin_customer_profile = request.user.customer_profile
            else:
                # If admin doesn't have a customer profile, try to find or create one
                try:
                    # Try to find existing customer profile by admin's email or username
                    admin_customer_profile = Customer.objects.filter(
                        email=request.user.email
                    ).first()
                    if not admin_customer_profile:
                        # Create a customer profile for the admin
                        admin_customer_profile = Customer.objects.create(
                            user=request.user,
                            name=request.user.get_full_name() or request.user.username,
                            email=request.user.email or f"{request.user.username}@system.local",
                            phone=request.user.email or "",
                            mobile_number="",
                            status='active'
                        )
                except Exception as e:
                    logger.warning(f"Could not create/get admin customer profile: {e}")
                    # Last resort: use assigned customer, but serializer will check if user is admin
                    # This shouldn't happen in normal operation
                    admin_customer_profile = customer
            ticket_buyer = admin_customer_profile
        else:
            # Regular ticket purchase - buyer is the ticket owner
            ticket_buyer = ticket_owner
        
        # Generate unique ticket number
        if ticket_owner:
            ticket_number = f"{event.id}-{ticket_owner.id}-{uuid.uuid4().hex[:8]}"
        else:
            # For assigned tickets without existing customer, use a temporary ID
            ticket_number = f"{event.id}-ASSIGNED-{uuid.uuid4().hex[:8]}"
        
        # Create ticket
        ticket = Ticket.objects.create(
            event=event,
            customer=ticket_owner,  # May be None for assigned tickets
            buyer=ticket_buyer,  # Admin if assigned, otherwise ticket owner
            category=category,
            price=Decimal(str(price)) if price else Decimal('0'),
            status='valid',
            ticket_number=ticket_number,
            assigned_mobile=assigned_mobile,
            assigned_email=assigned_email,
        )
        
        # Create payment transaction if not paid outside system
        # This ensures payment_status shows as 'completed'
        try:
            if ticket_owner:
                if not paid_outside_system and price and Decimal(str(price)) > 0:
                    PaymentTransaction.objects.create(
                        customer=ticket_owner,
                        ticket=ticket,
                        amount=Decimal(str(price)),
                        payment_method='admin_assigned',  # Mark as admin-assigned
                        status='completed',
                        transaction_id=f"ADMIN-{uuid.uuid4().hex[:16]}"
                    )
                elif paid_outside_system:
                    PaymentTransaction.objects.create(
                        customer=ticket_owner,
                        ticket=ticket,
                        amount=Decimal(str(price)) if price else Decimal('0'),
                        payment_method='paid_outside_system',
                        status='completed',
                        transaction_id=f"OUTSIDE-{uuid.uuid4().hex[:16]}"
                    )
        except Exception as e:
            logger.error(f"Error creating payment transaction for ticket {ticket.id}: {str(e)}", exc_info=True)
            # Don't fail the ticket creation if payment transaction creation fails
        
        # Handle notifications for assigned tickets (similar to customer-to-customer flow)
        # Always send notification if assigned_mobile is provided (admin is assigning to this phone number)
        if assigned_mobile:
            assigned_mobile = assigned_mobile.strip() if assigned_mobile else None
            if not assigned_mobile:
                logger.warning(f"Ticket {ticket.id} has empty assigned_mobile, skipping notification")
            else:
                from core.notification_service import (
                    send_ticket_assignment_sms,
                    send_ticket_assignment_email,
                    is_egyptian_number,
                )
                
                purchaser_name = request.user.get_full_name() or request.user.username or "Admin"
                is_egypt = is_egyptian_number(assigned_mobile)
                
                logger.info(f"Processing notification for admin-assigned ticket {ticket.id}, assigned_mobile: {assigned_mobile}")
                
                if assigned_customer:
                    # Existing user - send notifications immediately
                    logger.info(f"Sending notifications to existing user {assigned_customer.id} for ticket {ticket.id}, phone: {assigned_mobile}")
                    try:
                        if is_egypt:
                            sms_result = send_ticket_assignment_sms(ticket, purchaser_name, registration_token=None)
                            logger.info(f"SMS result for ticket {ticket.id}: {sms_result}")
                        else:
                            logger.info(f"Skipping SMS for ticket {ticket.id} (international number)")
                        # Always send email if email is provided
                        if assigned_email or assigned_customer.email:
                            send_ticket_assignment_email(ticket, purchaser_name, registration_token=None)
                    except Exception as e:
                        logger.error(f"Error sending notifications for ticket {ticket.id}: {str(e)}", exc_info=True)
                else:
                    # New user - create registration token and send notifications
                    print("=" * 80)
                    print("🆕 NEW USER DETECTED (ADMIN ASSIGNMENT) - Creating registration token")
                    print(f"   Ticket ID: {ticket.id}")
                    print(f"   Assigned Mobile: {assigned_mobile}")
                    print(f"   Event: {ticket.event.title}")
                    print("=" * 80)
                    logger.info(f"Creating registration token for new user {assigned_mobile} for ticket {ticket.id}")
                    registration_token = TicketRegistrationToken.create_for_ticket(ticket, assigned_mobile)
                    # Refresh from database to ensure it's saved
                    registration_token.refresh_from_db()
                    print(f"✅ Token saved to database. Token ID: {registration_token.id}")
                    logger.info(f"Registration token created and saved: ID={registration_token.id}, token (first 20): {registration_token.token[:20]}..., phone: {registration_token.phone_number}")
                    try:
                        if is_egypt:
                            sms_result = send_ticket_assignment_sms(ticket, purchaser_name, registration_token=registration_token)
                            print(f"📱 SMS Send Result: {sms_result}")
                            logger.info(f"SMS result for ticket {ticket.id}: {sms_result}")
                        else:
                            logger.info(f"Skipping SMS for ticket {ticket.id} (international number)")
                        # Always send email if email is provided
                        if assigned_email:
                            send_ticket_assignment_email(ticket, purchaser_name, registration_token=registration_token)
                    except Exception as e:
                        logger.error(f"Error sending notifications for ticket {ticket.id}: {str(e)}", exc_info=True)
        
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
        
        # Auto-remove ticket from marketplace when transferred
        from tickets.models import TicketMarketplaceListing
        marketplace_listings = TicketMarketplaceListing.objects.filter(
            ticket=ticket,
            is_active=True
        )
        for listing in marketplace_listings:
            listing.deactivate()
        
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
