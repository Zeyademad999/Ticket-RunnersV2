"""
Views for payments app.
"""
import uuid
import json
from decimal import Decimal
from django.conf import settings
from django.shortcuts import redirect
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import PaymentTransaction
from .serializers import PaymentTransactionSerializer
from .kashier_utils import generate_kashier_order_hash, validate_kashier_signature
from core.permissions import IsAdmin, IsCustomer
from customers.models import Customer
from tickets.models import Ticket
from events.models import Event


class PaymentTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing payment transactions.
    Admin can view all payments made by customers.
    """
    queryset = PaymentTransaction.objects.select_related('customer', 'ticket', 'ticket__event').all()
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_method']
    search_fields = ['transaction_id', 'customer__name', 'customer__email', 'customer__phone', 'ticket__ticket_number']
    ordering_fields = ['created_at', 'amount', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by date range if provided
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Filter by customer if provided
        customer_id = self.request.query_params.get('customer', None)
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        # Filter by ticket if provided
        ticket_id = self.request.query_params.get('ticket', None)
        if ticket_id:
            queryset = queryset.filter(ticket_id=ticket_id)
        
        return queryset
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Get payment statistics.
        GET /api/payments/stats/
        """
        queryset = self.get_queryset()
        
        total_payments = queryset.count()
        total_amount = sum(payment.amount for payment in queryset)
        completed_payments = queryset.filter(status='completed').count()
        completed_amount = sum(payment.amount for payment in queryset.filter(status='completed'))
        pending_payments = queryset.filter(status='pending').count()
        failed_payments = queryset.filter(status='failed').count()
        
        # Payment method breakdown
        payment_methods = {}
        for method in PaymentTransaction.PAYMENT_METHOD_CHOICES:
            method_code = method[0]
            method_name = method[1]
            count = queryset.filter(payment_method=method_code).count()
            amount = sum(payment.amount for payment in queryset.filter(payment_method=method_code))
            if count > 0:
                payment_methods[method_code] = {
                    'name': method_name,
                    'count': count,
                    'amount': float(amount)
                }
        
        return Response({
            'total_payments': total_payments,
            'total_amount': float(total_amount),
            'completed_payments': completed_payments,
            'completed_amount': float(completed_amount),
            'pending_payments': pending_payments,
            'failed_payments': failed_payments,
            'payment_methods': payment_methods
        })
    
    @action(detail=True, methods=['post'], url_path='mark-refunded')
    def mark_refunded(self, request, pk=None):
        """
        Mark a payment as refunded.
        POST /api/payments/{id}/mark-refunded/
        """
        payment = self.get_object()
        
        # Only allow marking completed payments as refunded
        if payment.status != 'completed':
            return Response({
                'error': {
                    'code': 'INVALID_STATUS',
                    'message': f'Only completed payments can be marked as refunded. Current status: {payment.status}'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update payment status
        payment.status = 'refunded'
        payment.save()
        
        # Log system action
        from core.utils import get_client_ip, log_system_action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='MARK_PAYMENT_REFUNDED',
            category='payment',
            severity='INFO',
            description=f'Marked payment {payment.transaction_id} as refunded',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        serializer = self.get_serializer(payment)
        return Response({
            'success': True,
            'message': 'Payment marked as refunded successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsCustomer])
def initialize_payment(request):
    """
    Initialize Kashier payment.
    POST /api/payment/initialize/
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Get customer from request (set by CustomerJWTAuthentication)
        # IsCustomer permission ensures customer exists, but we check anyway for safety
        customer = getattr(request, 'customer', None)
        
        if not customer:
            logger.error("No customer found for payment initialization - permission check should have prevented this")
            return Response({
                'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required. Please log in again.'}
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        logger.info(f"Payment initialization for customer: {customer.id}, mobile: {customer.mobile_number}")
        
        # Get booking data or transfer data from request
        event_id = request.data.get('event_id')
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'EGP')
        booking_data = request.data.get('booking_data', {})  # Store booking data for later
        transfer_data = request.data.get('transfer_data', {})  # Store transfer data for later
        nfc_card_data = request.data.get('nfc_card_data', {})  # Store NFC card data for later
        payment_type = request.data.get('payment_type', 'booking')  # 'booking', 'transfer', or 'nfc_card'
        
        # Get additional fees (card cost, renewal cost, etc.)
        additional_fees = {
            'card_cost': request.data.get('card_cost', 0),
            'renewal_cost': request.data.get('renewal_cost', 0),
            'subtotal': request.data.get('subtotal', 0),  # Ticket price
        }
        
        # For transfers, ticket_id is required instead of event_id
        if payment_type == 'transfer':
            ticket_id = request.data.get('ticket_id')
            if not ticket_id or not amount:
                return Response({
                    'error': {'code': 'INVALID_DATA', 'message': 'ticket_id and amount are required for transfer payments'}
                }, status=status.HTTP_400_BAD_REQUEST)
        elif payment_type == 'nfc_card':
            # For NFC card payments, only amount is required
            if not amount:
                return Response({
                    'error': {'code': 'INVALID_DATA', 'message': 'amount is required for NFC card payments'}
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            if not event_id or not amount:
                return Response({
                    'error': {'code': 'INVALID_DATA', 'message': 'event_id and amount are required'}
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get Kashier configuration from settings (reads from .env file)
        merchant_id = settings.KASHIER_MERCHANT_ID
        secret_key = settings.KASHIER_SECRET_KEY
        base_url = settings.KASHIER_BASE_URL
        mode = settings.KASHIER_MODE
        merchant_redirect = settings.KASHIER_MERCHANT_REDIRECT
        webhook_url = settings.KASHIER_WEBHOOK_URL
        
        # Generate unique order ID
        order_id = str(uuid.uuid4())
        
        # Format amount as string with exactly 2 decimal places
        amount_decimal = Decimal(str(amount))
        formatted_amount = f"{amount_decimal:.2f}"
        
        # Generate hash
        hash_value = generate_kashier_order_hash({
            'mid': merchant_id,
            'amount': formatted_amount,
            'currency': currency,
            'merchantOrderId': order_id,
            'secret': secret_key
        })
        
        # Create pending payment transaction
        payment_data = {
            'payment_type': payment_type,
            'additional_fees': additional_fees
        }
        
        if payment_type == 'transfer':
            payment_data['transfer_data'] = transfer_data
            payment_data['ticket_id'] = request.data.get('ticket_id')
        elif payment_type == 'nfc_card':
            payment_data['nfc_card_data'] = nfc_card_data
        else:
            payment_data['booking_data'] = booking_data
            payment_data['event_id'] = event_id
        
        transaction = PaymentTransaction.objects.create(
            customer=customer,
            amount=amount_decimal,
            payment_method='credit_card',  # Default for Kashier
            status='pending',
            transaction_id=order_id,
            payment_gateway_response=json.dumps(payment_data)
        )
        
        # Build script URL for kashier-checkout.js (following working example pattern)
        # Script loads from: {baseUrl}/kashier-checkout.js
        script_url = f"{base_url}/kashier-checkout.js"
        
        # Build HPP URL as fallback option (following working example pattern)
        from urllib.parse import quote_plus
        encoded_redirect = quote_plus(merchant_redirect)
        encoded_webhook = quote_plus(webhook_url)
        
        # Build HPP URL for iframe
        # Note: /v3/orders/ is a POST endpoint, so for HPP we might need a different approach
        # Try root path first (common HPP pattern), or check Kashier docs for HPP endpoint
        # If /v3/orders/ is POST-only, we may need to use form POST or script-based integration
        hpp_url = (
            f"{base_url}?"
            f"merchantId={merchant_id}&"
            f"orderId={order_id}&"
            f"amount={formatted_amount}&"
            f"currency={currency}&"
            f"hash={hash_value}&"
            f"merchantRedirect={encoded_redirect}&"
            f"serverWebhook={encoded_webhook}&"
            f"mode={mode}&"
            f"allowedMethods=card&"
            f"display=en"
        )
        
        logger.info(f"Script URL: {script_url}")
        logger.info(f"HPP URL: {hpp_url}")
        logger.info(f"Base URL: {base_url}, Merchant ID: {merchant_id}, Order ID: {order_id}")
        logger.info(f"Hash (first 20 chars): {hash_value[:20]}...")
        logger.info(f"Hash path used: /?payment={merchant_id}.{order_id}.{formatted_amount}.{currency}")
        
        return Response({
            'success': True,
            'data': {
                'orderId': order_id,
                'amount': formatted_amount,
                'currency': currency,
                'merchantId': merchant_id,
                'hash': hash_value,
                'scriptUrl': script_url,
                'hppUrl': hpp_url,  # Fallback URL for opening in new tab
                'merchantRedirect': merchant_redirect,
                'serverWebhook': webhook_url,
                'mode': mode,
                'baseUrl': base_url,
                'display': 'en',
                'allowedMethods': 'card',
                'customerReference': str(customer.id)  # User/Customer ID for Kashier
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error initializing payment: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'PAYMENT_INIT_ERROR', 'message': f'Failed to initialize payment: {str(e)}'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def handle_payment_redirect(request):
    """
    Handle payment redirect callback from Kashier.
    GET /api/payment/redirect/
    """
    try:
        # Get Kashier configuration from settings (reads from .env file)
        secret_key = settings.KASHIER_SECRET_KEY
        frontend_url = settings.FRONTEND_URL
        
        # Get query parameters
        query_params = request.query_params.dict()
        
        # Validate signature if present
        if query_params.get('signature'):
            if not validate_kashier_signature(query_params, secret_key):
                return redirect(f"{frontend_url}/payment/failed?reason=invalid_signature")
        
        # Get payment status
        payment_status = query_params.get('paymentStatus', '')
        # Use merchantOrderId first (this is what we stored), then fallback to orderId
        order_id = query_params.get('merchantOrderId') or query_params.get('orderId')
        
        import logging
        logger = logging.getLogger(__name__)
        print(f"DEBUG: Payment redirect received. Status: {payment_status}, Order ID: {order_id}", flush=True)
        logger.info(f"Payment redirect received. Status: {payment_status}, Order ID: {order_id}, Query params: {query_params}")
        
        if not order_id:
            print("DEBUG: No order_id found in query params", flush=True)
            logger.error("No order_id found in payment redirect query params")
            return redirect(f"{frontend_url}/payment/failed?reason=missing_order_id")
        
        # Find payment transaction
        try:
            transaction = PaymentTransaction.objects.get(transaction_id=order_id)
            print(f"DEBUG: Found transaction {transaction.id} for order_id {order_id}", flush=True)
        except PaymentTransaction.DoesNotExist:
            print(f"DEBUG: Transaction not found for order_id {order_id}", flush=True)
            logger.error(f"Transaction not found for order_id: {order_id}")
            return redirect(f"{frontend_url}/payment/failed?reason=transaction_not_found")
        
        # Update transaction status
        if payment_status == 'SUCCESS':
            print(f"DEBUG: Payment SUCCESS for order_id {order_id}", flush=True)
            
            # Preserve existing payment data when updating payment_gateway_response
            existing_response = json.loads(transaction.payment_gateway_response or '{}')
            payment_type = existing_response.get('payment_type', 'booking')
            booking_data = existing_response.get('booking_data', {})
            transfer_data = existing_response.get('transfer_data', {})
            nfc_card_data = existing_response.get('nfc_card_data', {})
            event_id = existing_response.get('event_id')
            ticket_id = existing_response.get('ticket_id')
            
            # Merge query params with existing data (preserve payment data)
            updated_response = query_params.copy()
            updated_response['payment_type'] = payment_type
            if booking_data:
                updated_response['booking_data'] = booking_data
            if transfer_data:
                updated_response['transfer_data'] = transfer_data
            if nfc_card_data:
                updated_response['nfc_card_data'] = nfc_card_data
            if event_id:
                updated_response['event_id'] = event_id
            if ticket_id:
                updated_response['ticket_id'] = ticket_id
            
            transaction.status = 'completed'
            transaction.payment_gateway_response = json.dumps(updated_response)
            transaction.save()
            
            logger.info(f"Payment transaction {order_id} marked as completed (type: {payment_type})")
            
            # Process payment based on type
            logger.info(f"Processing payment type: {payment_type} for transaction {order_id}")
            logger.info(f"Transfer data: {transfer_data}, Ticket ID: {ticket_id}")
            
            if payment_type == 'transfer':
                # Process transfer payment
                print(f"DEBUG: About to process transfer for transaction {order_id}", flush=True)
                logger.info(f"Starting transfer processing for transaction {order_id}, ticket_id: {ticket_id}")
                try:
                    transfer_result = _process_transfer_payment(transaction)
                    print(f"DEBUG: Successfully processed transfer for transaction {order_id}, result: {transfer_result}", flush=True)
                    logger.info(f"Processed transfer for transaction {order_id}, result: {transfer_result}")
                    if not transfer_result:
                        logger.error(f"Transfer processing returned False for transaction {order_id}")
                except Exception as e:
                    print(f"DEBUG: ERROR processing transfer: {str(e)}", flush=True)
                    logger.error(f"Error processing transfer for transaction {order_id}: {str(e)}", exc_info=True)
                    # Continue anyway - transfer might be processed via webhook
                
                # Get ticket information for confirmation page
                ticket_title = "Ticket Transfer"
                try:
                    if ticket_id:
                        from tickets.models import Ticket
                        ticket = Ticket.objects.select_related('event').get(id=ticket_id)
                        ticket_title = f"Transfer - {ticket.event.title}"
                        logger.info(f"Found ticket: {ticket.ticket_number} for event: {ticket.event.title}")
                except Exception as e:
                    logger.error(f"Error getting ticket info: {str(e)}")
                    pass
                
                # Get transaction ID from query params or use order_id
                transaction_id = query_params.get('transactionId') or order_id
                
                # Redirect to transfer confirmation page
                from urllib.parse import urlencode
                confirmation_params = urlencode({
                    'transactionId': transaction_id,
                    'orderId': order_id,
                    'amount': str(transaction.amount),
                    'ticketTitle': ticket_title,
                    'status': 'success',
                    'type': 'transfer'
                })
                frontend_url_clean = frontend_url.rstrip('/')
                confirmation_url = f"{frontend_url_clean}/payment-confirmation?{confirmation_params}"
            elif payment_type == 'nfc_card':
                # Process NFC card payment
                print(f"DEBUG: NFC card payment completed for transaction {order_id}", flush=True)
                logger.info(f"NFC card payment completed for transaction {order_id}, action: {nfc_card_data.get('action', 'unknown')}")
                
                # NFC card payment is complete - card will be assigned/renewed by merchant
                # Just mark transaction as completed (already done above)
                
                # Get transaction ID from query params or use order_id
                transaction_id = query_params.get('transactionId') or order_id
                
                # Redirect to NFC card payment confirmation page
                from urllib.parse import urlencode
                action = nfc_card_data.get('action', 'buy')
                confirmation_params = urlencode({
                    'transactionId': transaction_id,
                    'orderId': order_id,
                    'amount': str(transaction.amount),
                    'status': 'success',
                    'type': 'nfc_card',
                    'action': action
                })
                frontend_url_clean = frontend_url.rstrip('/')
                confirmation_url = f"{frontend_url_clean}/payment-confirmation?{confirmation_params}"
            else:
                # Process booking payment (create tickets)
                print(f"DEBUG: About to create tickets for transaction {order_id}", flush=True)
                try:
                    tickets_created = _create_tickets_from_payment(transaction)
                    print(f"DEBUG: Successfully created {tickets_created} tickets for transaction {order_id}", flush=True)
                    logger.info(f"Created {tickets_created} tickets for transaction {order_id}")
                    
                    # Send email notifications for assigned tickets after payment confirmation (redirect)
                    # Note: Webhook also sends emails, but we send here as backup in case webhook is delayed
                    if tickets_created > 0:
                        from tickets.models import Ticket, TicketRegistrationToken
                        from core.notification_service import send_ticket_assignment_email
                        
                        # Get all tickets for this transaction that have assigned_mobile
                        from django.utils import timezone
                        from datetime import timedelta
                        recent_time = timezone.now() - timedelta(minutes=5)
                        
                        transaction_tickets = Ticket.objects.filter(
                            buyer=transaction.customer,
                            purchase_date__gte=recent_time
                        ).exclude(assigned_mobile__isnull=True).exclude(assigned_mobile='')
                        
                        purchaser_name = transaction.customer.name or f"{transaction.customer.first_name} {transaction.customer.last_name}".strip() or "Someone"
                        
                        for ticket in transaction_tickets:
                            # Check if there's a registration token (new user)
                            registration_token = TicketRegistrationToken.objects.filter(
                                ticket=ticket,
                                used=False
                            ).first()
                            
                            # Send email notification (SMS was already sent during ticket creation)
                            send_ticket_assignment_email(ticket, purchaser_name, registration_token=registration_token)
                except Exception as e:
                    print(f"DEBUG: ERROR creating tickets: {str(e)}", flush=True)
                    logger.error(f"Error creating tickets for transaction {order_id}: {str(e)}", exc_info=True)
                    # Continue anyway - tickets might be created via webhook
                
                # Get event information from transaction for confirmation page
                event_title = "Event"
                try:
                    gateway_response = json.loads(transaction.payment_gateway_response or '{}')
                    event_id = gateway_response.get('event_id')
                    
                    if not event_id:
                        original_response = json.loads(transaction.payment_gateway_response or '{}')
                        event_id = original_response.get('event_id')
                    
                    if event_id:
                        try:
                            event = Event.objects.get(id=event_id)
                            event_title = event.title
                            logger.info(f"Found event: {event_title} (ID: {event_id})")
                        except Event.DoesNotExist:
                            logger.warning(f"Event {event_id} not found")
                            pass
                except Exception as e:
                    logger.error(f"Error getting event info: {str(e)}")
                    pass
                
                # Get transaction ID from query params or use order_id
                transaction_id = query_params.get('transactionId') or order_id
                
                # Redirect to PaymentConfirmation page with data
                from urllib.parse import urlencode
                confirmation_params = urlencode({
                    'transactionId': transaction_id,
                    'orderId': order_id,
                    'amount': str(transaction.amount),
                    'eventTitle': event_title,
                    'status': 'success'
                })
                frontend_url_clean = frontend_url.rstrip('/')
                confirmation_url = f"{frontend_url_clean}/payment-confirmation?{confirmation_params}"
            
            print(f"DEBUG: Redirecting to: {confirmation_url}", flush=True)
            print(f"DEBUG: Frontend URL: {frontend_url}, Clean: {frontend_url_clean}", flush=True)
            print(f"DEBUG: Confirmation params: {confirmation_params}", flush=True)
            logger.info(f"Payment successful! Redirecting to: {confirmation_url}")
            logger.info(f"Frontend URL from settings: {frontend_url}")
            logger.info(f"Confirmation params: {confirmation_params}")
            
            # Always use direct redirect for Kashier redirects (they come as direct browser redirects)
            # Use Django's redirect() function which handles both relative and absolute URLs
            print(f"DEBUG: About to redirect to: {confirmation_url}", flush=True)
            print(f"DEBUG: Confirmation URL type check: {type(confirmation_url)}", flush=True)
            
            # Use redirect() which is more reliable
            return redirect(confirmation_url)
        else:
            transaction.status = 'failed'
            transaction.payment_gateway_response = json.dumps(query_params)
            transaction.save()
            
            # Return HTML page that communicates with parent window (for iframe)
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Failed</title>
                <style>
                    body {{
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: #f0f0f0;
                    }}
                    .container {{
                        text-align: center;
                        padding: 20px;
                    }}
                    .error {{
                        color: #ef4444;
                        font-size: 24px;
                        font-weight: bold;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error">✗ Payment Failed</div>
                    <p>Please try again.</p>
                </div>
                <script>
                    // Send failure message to parent window (following working example pattern)
                    if (window.parent) {{
                        window.parent.postMessage({{
                            message: 'failure',
                            orderId: '{order_id}',
                            paymentStatus: 'failure',
                            status: 'failure'
                        }}, '*');
                    }}
                </script>
            </body>
            </html>
            """
            from django.http import HttpResponse
            return HttpResponse(html_content, content_type='text/html')
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error handling payment redirect: {str(e)}", exc_info=True)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8083')
        return redirect(f"{frontend_url}/payment/failed?reason=server_error")


@api_view(['POST'])
@permission_classes([AllowAny])
def handle_payment_webhook(request):
    """
    Handle payment webhook from Kashier (server-to-server).
    POST /api/payment/webhook/
    """
    try:
        # Get Kashier configuration from settings (reads from .env file)
        secret_key = settings.KASHIER_SECRET_KEY
        
        # Get webhook data
        webhook_data = request.data if hasattr(request, 'data') else request.POST.dict()
        
        # Validate signature if present
        if webhook_data.get('signature'):
            if not validate_kashier_signature(webhook_data, secret_key):
                return Response({
                    'error': 'Invalid signature'
                }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get payment status
        payment_status = webhook_data.get('paymentStatus', '')
        order_id = webhook_data.get('orderId') or webhook_data.get('merchantOrderId')
        
        if not order_id:
            return Response({
                'error': 'Missing order ID'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find payment transaction
        try:
            transaction = PaymentTransaction.objects.get(transaction_id=order_id)
        except PaymentTransaction.DoesNotExist:
            return Response({
                'error': 'Transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update transaction status
        if payment_status == 'SUCCESS':
            # Preserve existing payment data when updating payment_gateway_response
            existing_response = json.loads(transaction.payment_gateway_response or '{}')
            payment_type = existing_response.get('payment_type', 'booking')
            booking_data = existing_response.get('booking_data', {})
            transfer_data = existing_response.get('transfer_data', {})
            event_id = existing_response.get('event_id')
            ticket_id = existing_response.get('ticket_id')
            
            # Merge webhook data with existing data (preserve payment data)
            updated_response = webhook_data.copy()
            updated_response['payment_type'] = payment_type
            if booking_data:
                updated_response['booking_data'] = booking_data
            if transfer_data:
                updated_response['transfer_data'] = transfer_data
            if event_id:
                updated_response['event_id'] = event_id
            if ticket_id:
                updated_response['ticket_id'] = ticket_id
            
            transaction.status = 'completed'
            transaction.payment_gateway_response = json.dumps(updated_response)
            transaction.save()
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Webhook: Payment transaction {order_id} marked as completed (type: {payment_type})")
            
            # Process payment based on type
            if payment_type == 'transfer':
                logger.info(f"Webhook: Processing transfer for transaction {order_id}, ticket_id: {ticket_id}")
                try:
                    transfer_result = _process_transfer_payment(transaction)
                    logger.info(f"Webhook: Processed transfer for transaction {order_id}, result: {transfer_result}")
                    if not transfer_result:
                        logger.error(f"Webhook: Transfer processing returned False for transaction {order_id}")
                except Exception as e:
                    logger.error(f"Webhook: Error processing transfer for transaction {order_id}: {str(e)}", exc_info=True)
            else:
                # Create tickets if payment successful (booking)
                tickets_created = _create_tickets_from_payment(transaction)
                
                # Send email notifications for assigned tickets after payment confirmation
                if tickets_created > 0:
                    from tickets.models import Ticket, TicketRegistrationToken
                    from core.notification_service import send_ticket_assignment_email
                    
                    # Get all tickets for this transaction that have assigned_mobile
                    # Find tickets created in the last few seconds for this customer
                    from django.utils import timezone
                    from datetime import timedelta
                    recent_time = timezone.now() - timedelta(minutes=5)
                    
                    transaction_tickets = Ticket.objects.filter(
                        buyer=transaction.customer,
                        purchase_date__gte=recent_time
                    ).exclude(assigned_mobile__isnull=True).exclude(assigned_mobile='')
                    
                    purchaser_name = transaction.customer.name or f"{transaction.customer.first_name} {transaction.customer.last_name}".strip() or "Someone"
                    
                    for ticket in transaction_tickets:
                        # Check if there's a registration token (new user)
                        registration_token = TicketRegistrationToken.objects.filter(
                            ticket=ticket,
                            used=False
                        ).first()
                        
                        # Send email notification (SMS was already sent during ticket creation)
                        send_ticket_assignment_email(ticket, purchaser_name, registration_token=registration_token)
            
            return Response({'success': True}, status=status.HTTP_200_OK)
        else:
            transaction.status = 'failed'
            transaction.payment_gateway_response = json.dumps(webhook_data)
            transaction.save()
            return Response({'success': False, 'status': 'failed'}, status=status.HTTP_200_OK)
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error handling payment webhook: {str(e)}", exc_info=True)
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _create_tickets_from_payment(transaction):
    """
    Helper function to create tickets from a completed payment transaction.
    Returns the number of tickets created.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Get booking data from payment gateway response
        gateway_response = json.loads(transaction.payment_gateway_response or '{}')
        booking_data = gateway_response.get('booking_data', {})
        event_id = gateway_response.get('event_id')
        
        logger.info(f"Creating tickets for transaction {transaction.transaction_id}")
        logger.info(f"Event ID: {event_id}, Booking data: {booking_data}")
        
        if not event_id or not booking_data:
            # If no booking data, we can't create tickets
            logger.warning(f"No event_id or booking_data found in transaction {transaction.transaction_id}")
            return 0
        
        # Get event
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return
        
        # Get booking details
        category = booking_data.get('category', 'regular')
        quantity = booking_data.get('quantity', 1)
        ticket_details = booking_data.get('ticket_details', [])
        
        # Calculate price per ticket
        from events.models import TicketCategory
        try:
            ticket_category = TicketCategory.objects.get(event=event, name=category)
            price_per_ticket = Decimal(str(ticket_category.price))
        except TicketCategory.DoesNotExist:
            if event.starting_price:
                price_per_ticket = Decimal(str(event.starting_price))
            else:
                price_per_ticket = Decimal('300.00')
        
        # Create tickets
        tickets = []
        customer = transaction.customer
        
        for i in range(quantity):
            ticket_category_name = category
            ticket_price = price_per_ticket
            
            # Get ticket-specific details if available
            if ticket_details and i < len(ticket_details):
                detail = ticket_details[i]
                if detail.get('category'):
                    ticket_category_name = detail.get('category')
                    try:
                        specific_category = TicketCategory.objects.get(event=event, name=ticket_category_name)
                        ticket_price = Decimal(str(specific_category.price))
                    except TicketCategory.DoesNotExist:
                        if event.starting_price:
                            ticket_price = Decimal(str(event.starting_price))
                        else:
                            ticket_price = Decimal('300.00')
                elif detail.get('price') is not None:
                    ticket_price = Decimal(str(detail.get('price')))
            
            ticket_data = {
                'event': event,
                'buyer': customer,
                'customer': customer,
                'category': ticket_category_name,
                'price': ticket_price,
                'status': 'valid',
                'ticket_number': f"{event.id}-{customer.id}-{uuid.uuid4().hex[:8]}"
            }
            
            # Add assignment details if provided
            if ticket_details and i < len(ticket_details):
                detail = ticket_details[i]
                if not detail.get('is_owner', False):
                    ticket_data['assigned_name'] = detail.get('name', '').strip() or None
                    ticket_data['assigned_mobile'] = detail.get('mobile', '').strip() or None
                    ticket_data['assigned_email'] = detail.get('email', '').strip() or None
                    
                    # Try to link to assigned customer if exists
                    if ticket_data['assigned_mobile']:
                        try:
                            assigned_customer = Customer.objects.filter(mobile_number=ticket_data['assigned_mobile']).first()
                            if assigned_customer:
                                ticket_data['customer'] = assigned_customer
                        except Exception:
                            pass
                else:
                    # Owner's ticket - save child information
                    has_child_key_exists = 'has_child' in detail
                    has_child_value = detail.get('has_child', False)
                    child_age_value = detail.get('child_age')
                    
                    # Debug logging
                    logger.info(f"Payment ticket {i+1} - Owner ticket detail: has_child key exists: {has_child_key_exists}, value: {has_child_value}, child_age: {child_age_value}")
                    
                    # Only set has_child if the key exists and value is truthy
                    if has_child_key_exists:
                        ticket_data['has_child'] = bool(has_child_value)
                        # Only set child_age if has_child is True and child_age is provided
                        if bool(has_child_value) and child_age_value is not None:
                            ticket_data['child_age'] = int(child_age_value) if child_age_value else None
                        else:
                            ticket_data['child_age'] = None
                    else:
                        ticket_data['has_child'] = False
                        ticket_data['child_age'] = None
                    
                    logger.info(f"Payment ticket {i+1} - Final ticket_data: has_child={ticket_data.get('has_child')}, child_age={ticket_data.get('child_age')}")
            
            ticket = Ticket.objects.create(**ticket_data)
            tickets.append(ticket)
            logger.info(f"Created ticket {ticket.id} for customer {customer.id}")
            
            # Handle notifications for assigned tickets
            if ticket.assigned_mobile and ticket.assigned_mobile != customer.mobile_number:
                from customers.models import Customer
                from tickets.models import TicketRegistrationToken
                from core.notification_service import (
                    send_ticket_assignment_sms,
                    send_ticket_assignment_email,
                    is_egyptian_number,
                )
                
                assigned_mobile = ticket.assigned_mobile.strip() if ticket.assigned_mobile else None
                if not assigned_mobile:
                    logger.warning(f"Ticket {ticket.id} has empty assigned_mobile, skipping notification")
                    continue
                
                logger.info(f"Processing notification for ticket {ticket.id}, assigned_mobile: {assigned_mobile}")
                purchaser_name = customer.name or f"{customer.first_name} {customer.last_name}".strip() or "Someone"
                
                # Check if assigned customer exists
                assigned_customer = Customer.objects.filter(mobile_number=assigned_mobile, status='active').first()
                
                is_egypt = is_egyptian_number(assigned_mobile)

                if assigned_customer:
                    # Option 1: Existing user - send notifications immediately
                    logger.info(f"Sending notifications to existing user {assigned_customer.id} for ticket {ticket.id}, phone: {assigned_mobile}")
                    if is_egypt:
                        sms_result = send_ticket_assignment_sms(ticket, purchaser_name, registration_token=None)
                        logger.info(f"SMS result for ticket {ticket.id}: {sms_result}")
                    else:
                        logger.info(f"Skipping SMS for ticket {ticket.id} (international number)")
                    send_ticket_assignment_email(ticket, purchaser_name, registration_token=None)
                else:
                    # Option 2: New user - generate token and send SMS with registration link
                    print("=" * 80)
                    print("🆕 NEW USER DETECTED - Creating registration token")
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
                    if is_egypt:
                        sms_result = send_ticket_assignment_sms(ticket, purchaser_name, registration_token=registration_token)
                        print(f"📱 SMS Send Result: {sms_result}")
                        logger.info(f"SMS result for ticket {ticket.id}: {sms_result}")
                    else:
                        logger.info(f"Skipping SMS for ticket {ticket.id} (international number)")
                    # Email will be sent after payment confirmation (in webhook)
        
        # Update customer stats
        customer.total_bookings += quantity
        customer.total_spent += transaction.amount
        customer.save(update_fields=['total_bookings', 'total_spent'])
        
        logger.info(f"Successfully created {len(tickets)} tickets for transaction {transaction.transaction_id}")
        return len(tickets)
        
    except Exception as e:
        logger.error(f"Error creating tickets from payment: {str(e)}", exc_info=True)
        return 0


def _process_transfer_payment(transaction):
    """
    Helper function to process ticket transfer from a completed payment transaction.
    Returns True if transfer was successful.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Get transfer data from payment gateway response
        gateway_response = json.loads(transaction.payment_gateway_response or '{}')
        transfer_data = gateway_response.get('transfer_data', {})
        ticket_id = gateway_response.get('ticket_id')
        
        logger.info(f"Processing transfer for transaction {transaction.transaction_id}")
        logger.info(f"Ticket ID: {ticket_id} (type: {type(ticket_id)}), Transfer data: {transfer_data}")
        
        if not ticket_id or not transfer_data:
            logger.warning(f"No ticket_id or transfer_data found in transaction {transaction.transaction_id}")
            return False
        
        # Convert ticket_id to string if it's not already (handles UUID strings)
        ticket_id_str = str(ticket_id)
        logger.info(f"Looking for ticket with ID: {ticket_id_str}")
        
        # Get ticket
        from tickets.models import Ticket
        import uuid
        try:
            # Try to parse as UUID if it's a string
            if isinstance(ticket_id_str, str):
                try:
                    ticket_uuid = uuid.UUID(ticket_id_str)
                    ticket = Ticket.objects.select_related('event', 'customer', 'buyer').get(id=ticket_uuid)
                except (ValueError, Ticket.DoesNotExist) as e:
                    logger.error(f"Invalid UUID format or ticket not found: {ticket_id_str}, error: {str(e)}")
                    return False
            else:
                ticket = Ticket.objects.select_related('event', 'customer', 'buyer').get(id=ticket_id)
        except Ticket.DoesNotExist:
            logger.error(f"Ticket {ticket_id_str} not found")
            return False
        except Exception as e:
            logger.error(f"Error fetching ticket {ticket_id_str}: {str(e)}", exc_info=True)
            return False
        
        # Use ticket_id_str for logging consistency
        ticket_id = ticket_id_str
        
        # Verify ticket belongs to the customer making the payment
        if ticket.customer_id != transaction.customer_id:
            logger.error(f"Ticket {ticket_id} does not belong to customer {transaction.customer_id}")
            return False
        
        # Verify ticket is still valid
        if ticket.status != 'valid':
            logger.error(f"Ticket {ticket_id} is not valid (status: {ticket.status})")
            return False
        
        # Verify transfer is enabled for the event
        if not ticket.event.ticket_transfer_enabled:
            logger.error(f"Transfer is disabled for event {ticket.event.id}")
            return False
        
        # Check if ticket has already been transferred away
        from tickets.models import TicketTransfer
        existing_transfer = TicketTransfer.objects.filter(
            ticket=ticket,
            from_customer=transaction.customer,
            status='completed'
        ).exists()
        
        if existing_transfer:
            logger.error(f"Ticket {ticket_id} has already been transferred by customer {transaction.customer_id}")
            return False
        
        # Get recipient information
        recipient_mobile = transfer_data.get('recipient_mobile')
        recipient_name = transfer_data.get('recipient_name', '').strip()
        
        if not recipient_mobile:
            logger.error("recipient_mobile is required in transfer_data")
            return False
        
        # Try to find recipient customer
        from customers.models import Customer
        recipient = None
        try:
            recipient = Customer.objects.get(mobile_number=recipient_mobile, status='active')
            recipient_name = recipient.name if not recipient_name else recipient_name
        except Customer.DoesNotExist:
            # Recipient doesn't exist yet - will be linked when they register
            pass
        
        # Store original owner info BEFORE any changes
        from_customer = ticket.customer
        original_buyer = ticket.buyer if ticket.buyer else ticket.customer
        
        # CRITICAL: Create transfer record FIRST, before updating ticket
        # This ensures the ticket is immediately excluded from original owner's bookings
        from tickets.models import TicketTransfer
        
        # Check if transfer record already exists (prevent duplicates)
        existing_transfer = TicketTransfer.objects.filter(
            ticket=ticket,
            from_customer=from_customer,
            status='completed'
        ).first()
        
        if existing_transfer:
            logger.warning(f"Transfer record already exists for ticket {ticket_id} from customer {from_customer.id} (transfer ID: {existing_transfer.id})")
            transfer = existing_transfer
        else:
            # Create transfer record FIRST - this is critical for exclusion to work
            transfer = TicketTransfer.objects.create(
                ticket=ticket,
                from_customer=from_customer,
                to_customer=recipient,  # Will be None if recipient doesn't exist yet
                status='completed'
            )
            logger.info(f"Created transfer record for ticket {ticket_id} (transfer ID: {transfer.id}, from: {from_customer.id}, to: {recipient.id if recipient else None})")
        
        # Now update ticket ownership
        if recipient:
            # Recipient exists - transfer ownership immediately
            ticket.customer = recipient
            # Keep buyer as original purchaser (for tracking who paid)
            if not ticket.buyer:
                ticket.buyer = original_buyer
            # Clear assigned fields since ticket is now owned by recipient
            ticket.assigned_name = None
            ticket.assigned_mobile = None
            ticket.assigned_email = None
        else:
            # Recipient doesn't exist yet - set assigned fields, keep ticket with current owner
            # NOTE: ticket.customer stays as from_customer, but TicketTransfer record ensures exclusion
            ticket.assigned_name = recipient_name
            ticket.assigned_mobile = recipient_mobile
            ticket.assigned_email = transfer_data.get('recipient_email', '').strip() or None
        
        ticket.save()
        
        if recipient:
            logger.info(f"Successfully processed transfer for ticket {ticket_id} to {recipient.name} (transfer ID: {transfer.id})")
        else:
            logger.info(f"Transfer processed for ticket {ticket_id} to {recipient_mobile} (recipient not registered yet, transfer ID: {transfer.id})")
        
        # Verify the transfer record was created correctly
        verify_transfer = TicketTransfer.objects.filter(
            ticket_id=ticket_id,
            from_customer=from_customer,
            status='completed'
        ).first()
        
        if not verify_transfer:
            logger.error(f"CRITICAL: Transfer record verification failed for ticket {ticket_id} from customer {from_customer.id}")
            logger.error(f"CRITICAL: Ticket ID type: {type(ticket_id)}, Value: {ticket_id}")
            logger.error(f"CRITICAL: From customer ID: {from_customer.id}")
            # Try to find any transfer records for this ticket
            any_transfers = TicketTransfer.objects.filter(ticket_id=ticket_id).all()
            logger.error(f"CRITICAL: Found {any_transfers.count()} transfer records for this ticket: {[{'id': t.id, 'from': t.from_customer_id, 'to': t.to_customer_id, 'status': t.status} for t in any_transfers]}")
        else:
            logger.info(f"Transfer record verified for ticket {ticket_id} from customer {from_customer.id}")
            logger.info(f"Transfer record details: ID={verify_transfer.id}, ticket_id={verify_transfer.ticket_id}, from_customer={verify_transfer.from_customer_id}, to_customer={verify_transfer.to_customer_id}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error processing transfer payment: {str(e)}", exc_info=True)
        return False

