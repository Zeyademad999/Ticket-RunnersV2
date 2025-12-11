"""
Views for Merchant Portal.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q
import hashlib
import secrets
import logging
import re

logger = logging.getLogger(__name__)

from users.models import Merchant
from nfc_cards.models import NFCCard
from customers.models import Customer
from payments.models import PaymentTransaction
from core.otp_service import create_and_send_otp, verify_otp, get_otp_validation_error
from core.exceptions import AuthenticationError, ValidationError
from core.permissions import IsMerchant
import json
from .serializers import (
    MerchantLoginSerializer, MerchantOTPSerializer,
    MerchantProfileSerializer, CardAssignmentSerializer,
    CustomerVerificationSerializer, CustomerOTPRequestSerializer,
    NFCCardSerializer, MerchantSettingsSerializer, CardValidationSerializer
)


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])  # Skip authentication for login endpoint
def merchant_login(request):
    """
    Merchant login endpoint.
    POST /api/merchant/login/
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Log request details
    logger.info("=" * 80)
    logger.info("MERCHANT LOGIN REQUEST RECEIVED")
    logger.info(f"Request method: {request.method}")
    logger.info(f"Request path: {request.path}")
    logger.info(f"Request user: {request.user}")
    logger.info(f"Request authenticated: {request.user.is_authenticated if hasattr(request.user, 'is_authenticated') else 'N/A'}")
    logger.info(f"Request data: {request.data}")
    logger.info(f"Request data type: {type(request.data)}")
    logger.info(f"Request data keys: {list(request.data.keys()) if hasattr(request.data, 'keys') else 'N/A'}")
    logger.info(f"Request headers: {dict(request.headers) if hasattr(request, 'headers') else 'N/A'}")
    logger.info("=" * 80)
    
    serializer = MerchantLoginSerializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Serializer validation failed: {serializer.errors}")
        logger.error(f"Received data: mobile={request.data.get('mobile')}, password={'***' if request.data.get('password') else 'None'}")
        raise ValidationError(serializer.errors)
    
    mobile = serializer.validated_data['mobile']
    password = serializer.validated_data['password']
    
    logger.info(f"Looking for merchant with mobile: '{mobile}' (length: {len(mobile)})")
    logger.info(f"Mobile repr: {repr(mobile)}")
    
    try:
        merchant = Merchant.objects.get(mobile_number=mobile)
        logger.info(f"Merchant found: ID={merchant.id}, Status={merchant.status}, HasPassword={bool(merchant.password)}")
        logger.info(f"Stored mobile: '{merchant.mobile_number}' (length: {len(merchant.mobile_number)})")
        logger.info(f"Mobile match: {merchant.mobile_number == mobile}")
    except Merchant.DoesNotExist:
        logger.warning(f"Merchant not found for mobile: '{mobile}'")
        # Try to find similar mobile numbers for debugging
        similar = Merchant.objects.filter(mobile_number__icontains=mobile[:5])[:5]
        logger.warning(f"Similar mobile numbers found: {[m.mobile_number for m in similar]}")
        raise AuthenticationError("Invalid mobile number or password")
    
    password_check = merchant.check_password(password)
    logger.info(f"Password check result: {password_check}")
    logger.info(f"Password provided length: {len(password)}")
    
    if not password_check:
        logger.warning(f"Password check failed for merchant ID={merchant.id}")
        raise AuthenticationError("Invalid mobile number or password")
    
    if merchant.status != 'active':
        logger.warning(f"Merchant status is '{merchant.status}', not 'active'")
        raise AuthenticationError("Your account is not active")
    
    # Create and send OTP
    logger.info(f"Attempting to send OTP to mobile: {mobile}")
    otp, success = create_and_send_otp(mobile, 'login', app_name="TicketRunners Merchant")
    logger.info(f"OTP send result: success={success}, otp={'***' if otp else 'None'}")
    
    # If OTP was created, allow user to proceed even if SMS status is unclear
    # The OTP is stored in database and can be verified regardless of SMS API response
    if otp is None:
        logger.error(f"Failed to create OTP for mobile: {mobile}")
        return Response({
            'error': {
                'code': 'OTP_SEND_FAILED',
                'message': 'Failed to create OTP. Please try again.'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    if not success:
        # OTP was created but SMS status indicates failure
        # Log warning but still allow user to proceed since OTP exists in database
        logger.warning(f"OTP created for mobile {mobile} but SMS status indicates failure. OTP code: {otp.code if otp else 'N/A'}")
        logger.warning(f"User can still verify OTP since it exists in database")
    
    logger.info(f"OTP sent successfully to mobile: {mobile}")
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile': mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def merchant_verify_otp(request):
    """
    Verify OTP and return JWT tokens.
    POST /api/merchant/verify-otp/
    """
    serializer = MerchantOTPSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    mobile = serializer.validated_data['mobile']
    otp_code = serializer.validated_data['otp_code']
    
    if not verify_otp(mobile, otp_code, 'login'):
        error_msg = get_otp_validation_error(mobile, otp_code, 'login')
        raise AuthenticationError(error_msg)
    
    try:
        merchant = Merchant.objects.get(mobile_number=mobile)
    except Merchant.DoesNotExist:
        raise AuthenticationError("Merchant not found")
    
    # Update last login
    merchant.last_login = timezone.now()
    merchant.save(update_fields=['last_login'])
    
    # Create refresh token
    refresh = RefreshToken()
    refresh['merchant_id'] = str(merchant.id)
    refresh['mobile'] = mobile
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'merchant': MerchantProfileSerializer(merchant).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_logout(request):
    """
    Merchant logout endpoint.
    POST /api/merchant/logout/
    """
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsMerchant])
def merchant_me(request):
    """
    Get current merchant profile.
    GET /api/merchant/me/
    """
    merchant = request.merchant
    serializer = MerchantProfileSerializer(merchant)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsMerchant])
def merchant_dashboard_stats(request):
    """
    Get merchant dashboard statistics.
    GET /api/merchant/dashboard-stats/
    """
    try:
        merchant = request.merchant
        
        # Get merchant locations for this merchant
        from users.models import MerchantLocation
        merchant_locations = MerchantLocation.objects.filter(merchant=merchant)
        
        # Cards assigned to this merchant's locations
        # NFCCard.merchant is a ForeignKey to MerchantLocation, not Merchant
        merchant_cards = NFCCard.objects.filter(merchant__in=merchant_locations)
        
        # Available cards: Cards assigned to this merchant that are not yet assigned to customers
        # These are cards that this merchant can assign to customers
        available_cards = merchant_cards.filter(
            status='active',
            customer__isnull=True  # Not assigned to any customer yet
        )
        
        stats = {
            'available_cards': available_cards.count(),  # Cards assigned to merchant but not to customers
            'delivered_cards': merchant_cards.filter(status='active', delivered_at__isnull=False).count(),
            'assigned_cards': merchant_cards.filter(status='active', assigned_at__isnull=False).count(),
            'total_cards': merchant_cards.count(),  # Total cards assigned to this merchant
        }
        
        # Recent activity (last 10 card assignments by this merchant)
        recent_activity = merchant_cards.filter(assigned_at__isnull=False).order_by('-assigned_at')[:10]
        activity_data = []
        for card in recent_activity:
            activity_data.append({
                'card_serial': card.serial_number,
                'customer_name': card.customer.name if card.customer else 'N/A',
                'customer_mobile': card.customer.mobile_number if card.customer else 'N/A',
                'assigned_at': card.assigned_at.isoformat() if card.assigned_at else None,
                'delivered_at': card.delivered_at.isoformat() if card.delivered_at else None,
            })
        
        stats['recent_activity'] = activity_data
        
        return Response(stats, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        logger.error(f"Error in merchant_dashboard_stats: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': f'An error occurred: {str(e)}'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_assign_card(request):
    """
    Assign card to customer (multi-step workflow).
    POST /api/merchant/assign-card/
    """
    logger.info(f"=== merchant_assign_card called ===")
    logger.info(f"Request data: {request.data}")
    
    serializer = CardAssignmentSerializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Serializer validation failed: {serializer.errors}")
        raise ValidationError(serializer.errors)
    
    merchant = request.merchant
    card_serial = serializer.validated_data['card_serial']
    # Normalize serial number: trim whitespace and convert to uppercase
    card_serial = card_serial.strip().upper()
    customer_mobile = serializer.validated_data['customer_mobile']
    
    logger.info(f"Processing assignment: card_serial={card_serial}, customer_mobile={customer_mobile}")
    
    # IMPORTANT: Card must exist in admin system first - DO NOT auto-create
    # Check if card exists in the system (must be added by admin first)
    try:
        card = NFCCard.objects.get(serial_number=card_serial)
        logger.info(f"Card {card_serial} found in system")
    except NFCCard.DoesNotExist:
        # Card not found - return error (do not create it)
        logger.warning(f"❌ Card {card_serial} not found in system - rejecting assignment")
        return Response({
            'error': {'code': 'CARD_NOT_FOUND', 'message': 'This card was not added. Please contact Ticket Runners.'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if card is expired
    from django.utils import timezone
    from datetime import date
    if card.status == 'expired' or (card.expiry_date and card.expiry_date < date.today()):
        logger.warning(f"❌ Card {card_serial} is expired - rejecting assignment")
        return Response({
            'error': {'code': 'CARD_EXPIRED', 'message': 'This card has expired. Please contact Ticket Runners to renew the card.'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if card is already assigned to a customer
    if card.customer is not None:
        logger.warning(f"❌ Card {card_serial} is already assigned to customer {card.customer.id} ({card.customer.name})")
        # Check if it's assigned to the same customer
        try:
            normalized_mobile = normalize_mobile_number(customer_mobile)
            customer = Customer.objects.get(mobile_number=normalized_mobile)
            if card.customer == customer:
                logger.warning(f"Card {card_serial} already assigned to same customer {customer.name}")
                return Response({
                    'error': {'code': 'CARD_ALREADY_ASSIGNED', 'message': f'This card is already assigned to this customer ({customer.name})'}
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                logger.warning(f"Card {card_serial} already assigned to different customer {card.customer.name}, trying to assign to {customer.name}")
                return Response({
                    'error': {'code': 'CARD_ALREADY_ASSIGNED', 'message': f'This card is already assigned to another customer ({card.customer.name})'}
                }, status=status.HTTP_400_BAD_REQUEST)
        except Customer.DoesNotExist:
            # Customer doesn't exist, but card is assigned to someone else
            logger.warning(f"Card {card_serial} already assigned to customer {card.customer.id if card.customer else 'unknown'}, but customer {customer_mobile} not found")
            return Response({
                'error': {'code': 'CARD_ALREADY_ASSIGNED', 'message': f'This card is already assigned to another customer ({card.customer.name if card.customer else "unknown"})'}
            }, status=status.HTTP_400_BAD_REQUEST)
    
    logger.info(f"Card {card_serial} is not assigned, proceeding with assignment")
    
    # Card is not assigned, proceed with customer lookup
    try:
        normalized_mobile = normalize_mobile_number(customer_mobile)
        customer = Customer.objects.get(mobile_number=normalized_mobile)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'CUSTOMER_NOT_FOUND', 'message': 'Customer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if customer is registered (fees are paid in person to merchant, no check needed)
    if customer.status != 'active':
        return Response({
            'error': {'code': 'CUSTOMER_INACTIVE', 'message': 'Customer account is not active'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check NFC card payment status
    card_status = get_customer_nfc_card_status(customer)
    if not card_status['can_assign_card']:
        logger.warning(f"❌ Cannot assign card to customer {customer.mobile_number}: {card_status['status']} - {card_status['message']}")
        return Response({
            'error': {
                'code': 'CARD_PAYMENT_REQUIRED',
                'message': card_status['message'],
                'card_status': card_status['status']
            }
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Send OTP to customer (use normalized mobile number)
    otp, success = create_and_send_otp(normalized_mobile, 'customer_verification', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP to customer'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to customer mobile',
        'card_serial': card_serial,
        'customer_mobile': customer_mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_verify_customer_otp(request):
    """
    Verify customer OTP and complete card assignment.
    POST /api/merchant/verify-customer-otp/
    Supports photo verification (otp_code can be empty if photo_verified is true).
    """
    logger.info(f"=== merchant_verify_customer_otp called ===")
    logger.info(f"Request data: {request.data}")
    
    merchant = request.merchant
    card_serial = request.data.get('card_serial')
    # Normalize serial number: trim whitespace and convert to uppercase
    if card_serial:
        card_serial = card_serial.strip().upper()
    customer_mobile = request.data.get('customer_mobile')
    otp_code = request.data.get('otp_code', '').strip()
    photo_verified = request.data.get('photo_verified', False)
    
    if not all([card_serial, customer_mobile]):
        logger.error("Missing required fields: card_serial or customer_mobile")
        raise ValidationError("card_serial and customer_mobile are required")
    
    # Normalize mobile number
    normalized_mobile = normalize_mobile_number(customer_mobile)
    
    # Verify OTP only if provided, or if photo_verified is False
    # If photo_verified is True, OTP is optional
    if not photo_verified:
        if not otp_code:
            logger.error("OTP code is required when photo verification is not used")
            raise ValidationError("otp_code is required when photo_verified is false")
        
        # Verify OTP (use normalized mobile number)
        if not verify_otp(normalized_mobile, otp_code, 'customer_verification'):
            logger.warning(f"Invalid OTP for customer {customer_mobile}")
            error_msg = get_otp_validation_error(normalized_mobile, otp_code, 'customer_verification')
            raise AuthenticationError(error_msg)
    else:
        logger.info(f"Photo verification used for customer {customer_mobile} - OTP verification skipped")
    
    logger.info(f"OTP verified. Processing assignment: card_serial={card_serial}, customer_mobile={customer_mobile}")
    
    # IMPORTANT: Card must exist in admin system first - DO NOT auto-create
    # Check if card exists in the system (must be added by admin first)
    try:
        card = NFCCard.objects.get(serial_number=card_serial)
        logger.info(f"Card {card_serial} found in system")
    except NFCCard.DoesNotExist:
        # Card not found - return error (do not create it)
        logger.warning(f"❌ Card {card_serial} not found in system - rejecting assignment")
        return Response({
            'error': {'code': 'CARD_NOT_FOUND', 'message': 'This card was not added. Please contact Ticket Runners.'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if card is expired
    from django.utils import timezone
    from datetime import date
    if card.status == 'expired' or (card.expiry_date and card.expiry_date < date.today()):
        logger.warning(f"❌ Card {card_serial} is expired - rejecting assignment")
        return Response({
            'error': {'code': 'CARD_EXPIRED', 'message': 'This card has expired. Please contact Ticket Runners to renew the card.'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if card is already assigned to a customer
    if card.customer is not None:
        logger.warning(f"❌ Card {card_serial} is already assigned to customer {card.customer.id} ({card.customer.name})")
        # Check if it's assigned to the same customer
        try:
            normalized_mobile = normalize_mobile_number(customer_mobile)
            customer = Customer.objects.get(mobile_number=normalized_mobile)
            if card.customer == customer:
                return Response({
                    'error': {'code': 'CARD_ALREADY_ASSIGNED', 'message': f'This card is already assigned to this customer ({customer.name})'}
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'error': {'code': 'CARD_ALREADY_ASSIGNED', 'message': f'This card is already assigned to another customer ({card.customer.name})'}
                }, status=status.HTTP_400_BAD_REQUEST)
        except Customer.DoesNotExist:
            # Customer doesn't exist, but card is assigned to someone else
            return Response({
                'error': {'code': 'CARD_ALREADY_ASSIGNED', 'message': 'This card is already assigned to another customer'}
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # Card is not assigned, proceed with customer lookup
    try:
        normalized_mobile = normalize_mobile_number(customer_mobile)
        customer = Customer.objects.get(mobile_number=normalized_mobile)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'CUSTOMER_NOT_FOUND', 'message': 'Customer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check NFC card payment status before completing assignment
    card_status = get_customer_nfc_card_status(customer)
    if not card_status['can_assign_card']:
        logger.warning(f"❌ Cannot assign card to customer {customer.mobile_number}: {card_status['status']} - {card_status['message']}")
        return Response({
            'error': {
                'code': 'CARD_PAYMENT_REQUIRED',
                'message': card_status['message'],
                'card_status': card_status['status']
            }
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate hashed code for card writing
    hashed_code = hashlib.sha256(f"{card.serial_number}{customer.id}{timezone.now()}".encode()).hexdigest()
    
    # Assign card - set issue date to now, expiry based on settings
    from datetime import timedelta
    from nfc_cards.models import NFCCardSettings
    settings = NFCCardSettings.get_settings()
    issue_date = timezone.now().date()
    expiry_date = issue_date + timedelta(days=settings.card_validity_days)
    
    # Get merchant location for this merchant (optional)
    # NFCCard.merchant is a ForeignKey to MerchantLocation, not Merchant
    from users.models import MerchantLocation
    merchant_location = MerchantLocation.objects.filter(merchant=merchant).first()
    
    # If no location exists, we can still assign the card without setting merchant location
    # The merchant field is optional on NFCCard
    if merchant_location:
        card.merchant = merchant_location
        logger.info(f"Assigning card to merchant location: {merchant_location.id}")
    else:
        logger.warning(f"No merchant location found for merchant {merchant.id}, assigning card without merchant location")
    
    card.customer = customer
    card.assigned_at = timezone.now()
    card.issue_date = issue_date
    card.expiry_date = expiry_date
    card.hashed_code = hashed_code
    card.status = 'active'
    card.save()
    
    # Mark customer as having paid fees (since they have an active NFC card)
    if not customer.fees_paid:
        customer.fees_paid = True
        customer.save(update_fields=['fees_paid'])
    
    return Response({
        'message': 'Card assigned successfully',
        'hashed_code': hashed_code,
        'card': NFCCardSerializer(card, context={'request': request}).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsMerchant])
def merchant_check_customer_card_status(request):
    """
    Check customer's NFC card payment status.
    GET /api/merchant/check-customer-card-status/?mobile=<phone_number>
    """
    customer_mobile = request.query_params.get('mobile')
    if not customer_mobile:
        return Response({
            'error': {'code': 'MISSING_PARAMETER', 'message': 'mobile parameter is required'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        normalized_mobile = normalize_mobile_number(customer_mobile)
        customer = Customer.objects.get(mobile_number=normalized_mobile)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'CUSTOMER_NOT_FOUND', 'message': 'Customer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    card_status = get_customer_nfc_card_status(customer)
    
    return Response({
        'customer': {
            'id': str(customer.id),
            'name': customer.name,
            'mobile_number': customer.mobile_number
        },
        'card_status': card_status
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsMerchant])
def merchant_cards_list(request):
    """
    List merchant's cards and available cards.
    GET /api/merchant/cards/
    - If status='available': Returns all unassigned cards from admin NFC section
    - Otherwise: Returns cards assigned to this merchant
    """
    try:
        merchant = request.merchant
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')
        
        # Get merchant locations for this merchant
        from users.models import MerchantLocation
        merchant_locations = MerchantLocation.objects.filter(merchant=merchant)
        
        # Show cards assigned to this merchant's locations
        # NFCCard.merchant is a ForeignKey to MerchantLocation, not Merchant
        cards = NFCCard.objects.filter(merchant__in=merchant_locations).select_related('customer', 'collector')
        
        # Apply status filter if provided
        if status_filter == 'available':
            # Available cards: assigned to merchant but not to customers
            cards = cards.filter(status='active', customer__isnull=True)
        elif status_filter:
            cards = cards.filter(status=status_filter)
        
        # Apply search filter
        if search:
            cards = cards.filter(
                Q(serial_number__icontains=search) |
                Q(customer__mobile_number__icontains=search)
            )
        
        serializer = NFCCardSerializer(cards, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        logger.error(f"Error in merchant_cards_list: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': f'An error occurred: {str(e)}'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT'])
@permission_classes([IsMerchant])
def merchant_settings(request):
    """
    Get or update merchant settings.
    GET /api/merchant/settings/
    PUT /api/merchant/settings/
    """
    merchant = request.merchant
    
    if request.method == 'GET':
        serializer = MerchantSettingsSerializer(merchant)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # PUT - Update settings
    serializer = MerchantSettingsSerializer(merchant, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    raise ValidationError(serializer.errors)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_change_password(request):
    """
    Change merchant password.
    POST /api/merchant/change-password/
    """
    merchant = request.merchant
    
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    
    if not all([current_password, new_password, confirm_password]):
        raise ValidationError("All fields are required")
    
    if new_password != confirm_password:
        raise ValidationError("New passwords do not match")
    
    if not merchant.check_password(current_password):
        raise AuthenticationError("Current password is incorrect")
    
    merchant.set_password(new_password)
    merchant.save()
    
    return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_change_mobile(request):
    """
    Request mobile number change.
    POST /api/merchant/change-mobile/
    """
    merchant = request.merchant
    new_mobile = request.data.get('new_mobile')
    
    if not new_mobile:
        raise ValidationError("new_mobile is required")
    
    # Send OTP to new mobile
    otp, success = create_and_send_otp(new_mobile, 'mobile_change', app_name="TicketRunners Merchant")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to new mobile number',
        'new_mobile': new_mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_verify_mobile_change(request):
    """
    Verify mobile change OTP and update mobile.
    POST /api/merchant/verify-mobile-change/
    """
    merchant = request.merchant
    new_mobile = request.data.get('new_mobile')
    otp_code = request.data.get('otp_code')
    
    if not all([new_mobile, otp_code]):
        raise ValidationError("new_mobile and otp_code are required")
    
    if not verify_otp(new_mobile, otp_code, 'mobile_change'):
        error_msg = get_otp_validation_error(new_mobile, otp_code, 'mobile_change')
        raise AuthenticationError(error_msg)
    
    merchant.mobile_number = new_mobile
    merchant.save(update_fields=['mobile_number'])
    
    return Response({
        'message': 'Mobile number updated successfully',
        'mobile': new_mobile
    }, status=status.HTTP_200_OK)


def get_customer_nfc_card_status(customer):
    """
    Get customer's NFC card payment status.
    Returns a dictionary with status information.
    """
    from nfc_cards.models import NFCCardSettings
    
    # Check if customer has any active NFC card
    has_active_card = NFCCard.objects.filter(
        customer=customer,
        status='active'
    ).exists()
    
    # Check if customer has already made any completed payment transaction
    # If they have, they've already paid both the NFC card fee and renewal cost in their first purchase
    has_paid_for_new_card = PaymentTransaction.objects.filter(
        customer=customer,
        status='completed'
    ).exists()
    
    # Check if customer has paid for renewal (same as new card payment)
    has_paid_for_renewal = has_paid_for_new_card
    
    # Customer can assign card if:
    # 1. They have an active card, OR
    # 2. They have paid for a new card (completed payment transaction exists)
    can_assign_card = has_active_card or has_paid_for_new_card
    
    # Determine status message
    if has_active_card:
        status = 'has_active_card'
        message = 'Customer has an active NFC card'
    elif has_paid_for_new_card:
        status = 'paid_awaiting_card'
        message = 'Customer has paid for NFC card and is awaiting card assignment'
    else:
        status = 'payment_required'
        message = 'Customer needs to pay for NFC card before assignment'
    
    return {
        'has_active_card': has_active_card,
        'has_paid_for_new_card': has_paid_for_new_card,
        'has_paid_for_renewal': has_paid_for_renewal,
        'can_assign_card': can_assign_card,
        'status': status,
        'message': message
    }


def normalize_mobile_number(mobile_number: str) -> str:
    """
    Normalize mobile number to handle different formats.
    Converts Egyptian numbers from 01104484492 to +201104484492 format.
    """
    if not mobile_number:
        return mobile_number
    
    # Remove any whitespace
    mobile_number = mobile_number.strip()
    
    # Remove all non-digit characters for processing
    digits_only = re.sub(r'\D', '', mobile_number)
    
    # Handle case where there's an extra 0 after country code: +2001... or 2001...
    # This happens when user inputs 01012900990 with +20, resulting in +2001012900990
    if digits_only.startswith('2001') and len(digits_only) == 13:
        # Remove the extra 0: 2001104484492 -> 201104484492
        return '+20' + digits_only[3:]
    
    # If it starts with +20, check for extra 0
    if mobile_number.startswith('+20'):
        if len(digits_only) == 13 and digits_only[2] == '0':
            # Remove the extra 0: +2001104484492 -> +201104484492
            return '+20' + digits_only[3:]
        return mobile_number
    
    # If it starts with 20 (without +), add + and check for extra 0
    if digits_only.startswith('20') and len(digits_only) >= 12:
        if len(digits_only) == 13 and digits_only[2] == '0':
            # Remove the extra 0: 2001104484492 -> +201104484492
            return '+20' + digits_only[3:]
        return '+' + digits_only
    
    # If it starts with 0 (Egyptian local format), replace 0 with +20
    if digits_only.startswith('0') and len(digits_only) == 11:
        return '+20' + digits_only[1:]
    
    # If it's 10 digits starting with 1 (Egyptian mobile without leading 0)
    if digits_only.startswith('1') and len(digits_only) == 10:
        return '+20' + digits_only
    
    # Return as is if no pattern matches
    return mobile_number


@api_view(['GET'])
@permission_classes([IsMerchant])
def merchant_verify_customer(request, mobile):
    """
    Verify customer separately (check registration & fees).
    GET /api/merchant/verify-customer/:mobile/
    Returns customer photo and authorized collector info if available.
    """
    merchant = request.merchant
    
    # Normalize mobile number to handle different formats
    normalized_mobile = normalize_mobile_number(mobile)
    
    # Try to find customer with normalized number first, then try original
    try:
        customer = Customer.objects.get(mobile_number=normalized_mobile)
    except Customer.DoesNotExist:
        # Try with original format as fallback
        try:
            customer = Customer.objects.get(mobile_number=mobile)
        except Customer.DoesNotExist:
            return Response({
                'error': {'code': 'CUSTOMER_NOT_FOUND', 'message': 'Customer not found'}
            }, status=status.HTTP_404_NOT_FOUND)
    
    # Get customer profile image URL
    customer_profile_image = None
    if customer.profile_image:
        try:
            customer_profile_image = request.build_absolute_uri(customer.profile_image.url)
        except (AttributeError, ValueError):
            pass
    
    # Check if customer has any NFC cards with an authorized collector
    # Get the most recent card with a collector (if any)
    collector_info = None
    try:
        from nfc_cards.models import NFCCard
        card_with_collector = NFCCard.objects.filter(
            customer=customer,
            collector__isnull=False
        ).select_related('collector').order_by('-assigned_at').first()
        
        if card_with_collector and card_with_collector.collector:
            collector = card_with_collector.collector
            collector_profile_image = None
            if collector.profile_image:
                try:
                    collector_profile_image = request.build_absolute_uri(collector.profile_image.url)
                except (AttributeError, ValueError):
                    pass
            
            collector_info = {
                'id': str(collector.id),
                'name': collector.name,
                'mobile_number': collector.mobile_number,
                'profile_image': collector_profile_image
            }
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error getting collector info: {str(e)}")
    
    data = {
        'id': customer.id,
        'name': customer.name,
        'mobile_number': customer.mobile_number,
        'email': customer.email,
        'status': customer.status,
        'fees_paid': customer.fees_paid,
        'is_registered': True,
        'can_assign_card': customer.status == 'active',  # Fees paid in person, no check needed
        'profile_image': customer_profile_image,
        'authorized_collector': collector_info  # Will be None if no collector assigned
    }
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_send_customer_otp(request):
    """
    Send OTP to customer separately.
    POST /api/merchant/send-customer-otp/
    """
    merchant = request.merchant
    customer_mobile = request.data.get('customer_mobile')
    
    if not customer_mobile:
        raise ValidationError("customer_mobile is required")
    
    # Normalize mobile number
    normalized_mobile = normalize_mobile_number(customer_mobile)
    
    try:
        customer = Customer.objects.get(mobile_number=normalized_mobile)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'CUSTOMER_NOT_FOUND', 'message': 'Customer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if customer.status != 'active':
        return Response({
            'error': {'code': 'CUSTOMER_INACTIVE', 'message': 'Customer account is not active'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Fees are paid in person to merchant, no check needed
    # Use normalized mobile number for OTP
    otp, success = create_and_send_otp(normalized_mobile, 'customer_verification', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP to customer'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to customer mobile',
        'customer_mobile': customer_mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsMerchant])
def merchant_validate_card(request):
    """
    Validate NFC card - check if it exists and if it's already assigned.
    POST /api/merchant/validate-card/
    Body: { "card_serial": "card123" }
    """
    logger.info(f"=== merchant_validate_card called ===")
    logger.info(f"Request data: {request.data}")
    
    merchant = request.merchant
    
    serializer = CardValidationSerializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Serializer validation failed: {serializer.errors}")
        raise ValidationError(serializer.errors)
    
    card_serial = serializer.validated_data['card_serial']
    # Normalize serial number: trim whitespace and convert to uppercase
    card_serial = card_serial.strip().upper()
    logger.info(f"Validating card: card_serial={card_serial}")
    
    # Check if card exists in the system
    try:
        card = NFCCard.objects.get(serial_number=card_serial)
        logger.info(f"Card {card_serial} found in system")
    except NFCCard.DoesNotExist:
        # Card not found - return error
        logger.warning(f"❌ Card {card_serial} not found in system")
        return Response({
            'valid': False,
            'error': {
                'code': 'CARD_NOT_FOUND',
                'message': 'This card was not added. Please contact Ticket Runners.'
            }
        }, status=status.HTTP_200_OK)
    
    # Check if card is expired
    from django.utils import timezone
    from datetime import date
    if card.status == 'expired' or (card.expiry_date and card.expiry_date < date.today()):
        logger.warning(f"❌ Card {card_serial} is expired")
        return Response({
            'valid': False,
            'error': {
                'code': 'CARD_EXPIRED',
                'message': 'This card has expired. Please contact Ticket Runners to renew the card.'
            }
        }, status=status.HTTP_200_OK)
    
    # Check if card is already assigned to a customer
    if card.customer is not None:
        logger.warning(f"❌ Card {card_serial} is already assigned to customer {card.customer.id} ({card.customer.name})")
        
        # Get customer profile image
        customer_profile_image = None
        if card.customer.profile_image:
            try:
                customer_profile_image = request.build_absolute_uri(card.customer.profile_image.url)
            except (AttributeError, ValueError):
                pass
        
        # Get collector information if exists
        collector_info = None
        if card.collector:
            collector_profile_image = None
            if card.collector.profile_image:
                try:
                    collector_profile_image = request.build_absolute_uri(card.collector.profile_image.url)
                except (AttributeError, ValueError):
                    pass
            
            collector_info = {
                'id': str(card.collector.id),
                'name': card.collector.name,
                'mobile_number': card.collector.mobile_number,
                'profile_image': collector_profile_image
            }
        
        return Response({
            'valid': False,
            'error': {
                'code': 'CARD_ALREADY_ASSIGNED',
                'message': f'This card is already assigned to {card.customer.name} ({card.customer.mobile_number})'
            },
            'card': {
                'serial_number': card.serial_number,
                'status': card.status,
                'customer_name': card.customer.name,
                'customer_mobile': card.customer.mobile_number,
                'customer_profile_image': customer_profile_image,
                'collector': collector_info,
                'authorized_collector': collector_info  # For backward compatibility
            }
        }, status=status.HTTP_200_OK)
    
    # Card is valid and available for assignment
    logger.info(f"✅ Card {card_serial} is valid and available for assignment")
    return Response({
        'valid': True,
        'card': {
            'serial_number': card.serial_number,
            'status': card.status,
            'card_type': card.card_type,
        }
    }, status=status.HTTP_200_OK)
