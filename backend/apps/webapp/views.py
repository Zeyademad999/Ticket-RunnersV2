"""
Views for WebApp Portal (User-Facing).
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q, Sum, Count
from django.db import IntegrityError
from datetime import timedelta, datetime, date
from decimal import Decimal
import uuid
import json

from customers.models import Customer, Dependent
from .authentication import CustomerJWTAuthentication
from events.models import Event
from tickets.models import Ticket, TicketRegistrationToken
from nfc_cards.models import NFCCard, NFCCardAutoReload, NFCCardTransaction
import os
from payments.models import PaymentTransaction
from apps.webapp.models import Favorite
from users.models import MerchantLocation
from core.otp_service import create_and_send_otp, verify_otp
from core.rate_limiting import rate_limit_otp_request
from core.exceptions import AuthenticationError, ValidationError
import re
from .serializers import (
    UserRegistrationSerializer, UserOTPSerializer, UserLoginSerializer,
    UserProfileSerializer, DependentSerializer, PublicEventSerializer,
    TicketBookingSerializer, TicketSerializer, NFCCardSerializer,
    PaymentTransactionSerializer, FavoriteSerializer
)


def normalize_mobile_number(mobile_number: str) -> str:
    """
    Normalize mobile number to handle different formats.
    Converts Egyptian numbers from 01104484492 to +201104484492 format.
    """
    if not mobile_number:
        return mobile_number
    
    # Remove any whitespace
    mobile_number = mobile_number.strip()
    
    # If it starts with +20, return as is
    if mobile_number.startswith('+20'):
        return mobile_number
    
    # If it starts with 20 (without +), add +
    if mobile_number.startswith('20') and len(mobile_number) >= 12:
        return '+' + mobile_number
    
    # If it starts with 0 (Egyptian local format), replace 0 with +20
    if mobile_number.startswith('0') and len(mobile_number) == 11:
        return '+20' + mobile_number[1:]
    
    # If it's 11 digits starting with 1 (Egyptian mobile without leading 0)
    if mobile_number.startswith('1') and len(mobile_number) == 10:
        return '+20' + mobile_number
    
    # Return as is if no pattern matches
    return mobile_number


def parse_date_value(value):
    """Convert various date representations to a date object."""
    if not value:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            try:
                return datetime.strptime(value, '%Y-%m-%d').date()
            except ValueError:
                return None
    return None


@api_view(['POST'])
@permission_classes([AllowAny])
@rate_limit_otp_request(limit=1, window=60)  # 1 request per 60 seconds
def user_register(request):
    """
    User registration.
    POST /api/v1/users/register/
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(
            detail='Invalid input data.',
            details=serializer.errors
        )
    
    mobile_number = serializer.validated_data['mobile_number']
    name = serializer.validated_data.get('name', '')
    email = serializer.validated_data.get('email', '')
    national_id = serializer.validated_data.get('national_id', '')
    nationality = serializer.validated_data.get('nationality', '')
    gender = serializer.validated_data.get('gender', '')
    date_of_birth = serializer.validated_data.get('date_of_birth')
    otp_delivery_method = serializer.validated_data.get('otp_delivery_method', 'sms')
    
    # Check if user already exists
    if Customer.objects.filter(mobile_number=mobile_number).exists():
        raise ValidationError("User with this mobile number already exists")
    
    # Check if national_id already exists
    if national_id and Customer.objects.filter(national_id=national_id).exists():
        raise ValidationError("User with this National ID already exists")
    
    # Determine OTP delivery channel
    otp_delivery_method = otp_delivery_method or 'sms'
    if otp_delivery_method == 'email':
        if not email:
            raise ValidationError("Email is required to send OTP via email")
        otp_target = email
        otp_purpose = 'email_verification'
    else:
        otp_target = mobile_number
        otp_purpose = 'registration'
    
    # Create and send OTP
    otp, success = create_and_send_otp(otp_target, otp_purpose, app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Store registration data temporarily in cache (valid for 10 minutes)
    from django.core.cache import cache
    cache_key = f"registration_{mobile_number}"
    cache.set(cache_key, {
        'name': name,
        'email': email,
        'mobile_number': mobile_number,
        'national_id': national_id,
        'nationality': nationality,
        'gender': gender,
        'date_of_birth': date_of_birth.isoformat() if date_of_birth else None,
        'otp_delivery_method': otp_delivery_method,
    }, timeout=600)  # 10 minutes
    
    # Return mobile_number as signup_id for frontend compatibility
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile_number': mobile_number,
        'signup_id': mobile_number  # Use mobile_number as signup_id for frontend compatibility
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_verify_otp(request):
    """
    Verify OTP - Step 2: Verify mobile OTP (doesn't complete registration yet).
    POST /api/v1/users/verify-otp/
    """
    serializer = UserOTPSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(
            detail='Invalid input data.',
            details=serializer.errors
        )
    
    mobile_number = serializer.validated_data['mobile_number']
    otp_code = serializer.validated_data['otp_code']
    
    
    # Check if user already exists (account was already created)
    if Customer.objects.filter(mobile_number=mobile_number).exists():
        # Account already exists - return success
        return Response({
            'mobile_verified': True,
            'message': 'Mobile number already verified. Account exists.',
            'account_exists': True
        }, status=status.HTTP_200_OK)
    
    # Get registration data from cache
    from django.core.cache import cache
    cache_key = f"registration_{mobile_number}"
    registration_data = cache.get(cache_key)
    
    if not registration_data:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"No registration data found in cache for mobile_number: {mobile_number} (cache_key: {cache_key})")
        raise ValidationError("Registration session expired. Please start again.")
    
    otp_method = registration_data.get('otp_delivery_method', 'sms')
    if otp_method == 'email':
        email = registration_data.get('email')
        if not email:
            raise ValidationError("Email address missing for email-based verification")
        if not verify_otp(email, otp_code, 'email_verification'):
            raise ValidationError("Invalid or expired OTP")
    else:
        if not verify_otp(mobile_number, otp_code, 'registration'):
            raise ValidationError("Invalid or expired OTP")
    
    # Mark verification as complete in cache
    registration_data['mobile_verified'] = True
    
    # Store optional info if provided
    if request.data.get('emergency_contact_name'):
        registration_data['emergency_contact_name'] = request.data.get('emergency_contact_name')
    if request.data.get('emergency_contact_mobile'):
        registration_data['emergency_contact_mobile'] = request.data.get('emergency_contact_mobile')
    if request.data.get('blood_type'):
        registration_data['blood_type'] = request.data.get('blood_type')
    
    cache.set(cache_key, registration_data, timeout=600)  # Reset timeout to 10 minutes
    
    return Response({
        'mobile_verified': True,
        'message': 'Mobile number verified successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@rate_limit_otp_request(limit=1, window=60)  # 1 request per 60 seconds
def user_send_email_otp(request):
    """
    Send email OTP for signup verification.
    POST /api/v1/users/send-email-otp/
    """
    try:
        # Handle both dict and string request.data
        if isinstance(request.data, str):
            import json
            try:
                data = json.loads(request.data)
            except json.JSONDecodeError:
                data = {}
        else:
            data = request.data
        
        mobile_number = data.get('mobile_number') if isinstance(data, dict) else None
        email = data.get('email') if isinstance(data, dict) else None
        
        if not mobile_number or not email:
            raise ValidationError("mobile_number and email are required")
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Sending email OTP for mobile_number: {mobile_number}, email: {email}")
    
        # Check if user already exists (account was already created)
        if Customer.objects.filter(mobile_number=mobile_number).exists():
            # Account already exists - return success
            return Response({
                'email_otp_sent': True,
                'message': 'Account already exists. Email verification not required.',
                'account_exists': True
            }, status=status.HTTP_200_OK)
        
        # Get registration data from cache
        from django.core.cache import cache
        cache_key = f"registration_{mobile_number}"
        registration_data = cache.get(cache_key)
        
        if not registration_data:
            logger.warning(f"No registration data found in cache for mobile_number: {mobile_number}")
            # Try to find any registration data for debugging
            logger.warning(f"Cache key used: {cache_key}")
            raise ValidationError("Registration session expired. Please start again.")
        
        logger.info(f"Found registration data: mobile_verified={registration_data.get('mobile_verified')}, email={registration_data.get('email')}")
        
        otp_method = registration_data.get('otp_delivery_method', 'sms')
        if otp_method != 'email' and not registration_data.get('mobile_verified'):
            raise ValidationError("Mobile number must be verified first")
        
        # Verify email matches
        if registration_data.get('email') != email:
            logger.warning(f"Email mismatch: cache has '{registration_data.get('email')}', received '{email}'")
            raise ValidationError("Email does not match registration data")
        
        # Create and send email OTP
        otp, success = create_and_send_otp(email, 'email_verification', app_name="TicketRunners")
        
        if not success:
            logger.error(f"Failed to send email OTP to {email}")
            return Response({
                'error': {'code': 'EMAIL_OTP_SEND_FAILED', 'message': 'Failed to send email OTP'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Mark email OTP as sent in cache
        registration_data['email_otp_sent'] = True
        cache.set(cache_key, registration_data, timeout=600)
        
        logger.info(f"Email OTP sent successfully to {email}")
        return Response({
            'email_otp_sent': True,
            'message': 'OTP sent to your email address'
        }, status=status.HTTP_200_OK)
    except ValidationError:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending email OTP: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'EMAIL_OTP_SEND_FAILED', 'message': 'Failed to send email OTP. Please try again.'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_verify_email_otp(request):
    """
    Verify email OTP for signup verification.
    POST /api/v1/users/verify-email-otp/
    """
    mobile_number = request.data.get('mobile_number')
    email = request.data.get('email')
    otp_code = request.data.get('otp_code')
    
    if not mobile_number or not email or not otp_code:
        raise ValidationError("mobile_number, email, and otp_code are required")
    
    # Verify email OTP (using email as phone_number for OTP lookup)
    if not verify_otp(email, otp_code, 'email_verification'):
        raise ValidationError("Invalid or expired email OTP")
    
    # Check if user already exists (account was already created)
    if Customer.objects.filter(mobile_number=mobile_number).exists():
        # Account already exists - return success
        return Response({
            'email_verified': True,
            'message': 'Email already verified. Account exists.',
            'account_exists': True
        }, status=status.HTTP_200_OK)
    
    # Get registration data from cache
    from django.core.cache import cache
    cache_key = f"registration_{mobile_number}"
    registration_data = cache.get(cache_key)
    
    if not registration_data:
        raise ValidationError("Registration session expired. Please start again.")
    
    # Mark email as verified in cache
    registration_data['email_verified'] = True
    cache.set(cache_key, registration_data, timeout=600)
    
    return Response({
        'email_verified': True,
        'message': 'Email verified successfully'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def user_upload_profile_image(request):
    """
    Upload profile image during signup.
    POST /api/v1/signup/profile-image/
    """
    try:
        signup_id = request.data.get('signup_id')
        profile_image = request.FILES.get('file')
        
        if not signup_id:
            raise ValidationError("signup_id is required")
        
        # Convert signup_id to string (it might be sent as integer from frontend)
        signup_id = str(signup_id).strip()
        
        if not profile_image:
            raise ValidationError("Profile image file is required")
        
        # Validate file type - accept all common image formats
        allowed_types = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'image/bmp', 'image/svg+xml', 'image/tiff', 'image/x-icon',
            'image/vnd.microsoft.icon', 'image/x-ms-bmp', 'image/x-png', 'image/x-icon'
        ]
        # Also check file extension as fallback
        file_extension = ''
        if profile_image.name:
            file_extension = os.path.splitext(profile_image.name)[1].lower().lstrip('.')
        allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'tif', 'ico']
        
        content_type = getattr(profile_image, 'content_type', None) or ''
        if content_type not in allowed_types and file_extension not in allowed_extensions:
            raise ValidationError("Invalid file type. Please upload a valid image file.")
        
        # Validate file size (5MB)
        max_size = 5 * 1024 * 1024
        file_size = getattr(profile_image, 'size', 0)
        if file_size > max_size:
            raise ValidationError("Image size must be less than 5MB.")
        
        # Check if user already exists (account was already created)
        if Customer.objects.filter(mobile_number=signup_id).exists():
            # Account already exists - save image directly to customer profile
            customer = Customer.objects.get(mobile_number=signup_id)
            customer.profile_image = profile_image
            customer.save(update_fields=['profile_image'])
            
            # Safely get profile image URL
            profile_image_url = None
            try:
                if customer.profile_image:
                    profile_image_url = customer.profile_image.url
            except (AttributeError, ValueError) as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Could not get profile image URL: {str(e)}")
            
            return Response({
                'profile_image_url': profile_image_url,
                'message': 'Profile image uploaded successfully',
                'account_exists': True
            }, status=status.HTTP_200_OK)
        
        # Get registration data from cache
        from django.core.cache import cache
        cache_key = f"registration_{signup_id}"
        registration_data = cache.get(cache_key)
        
        if not registration_data:
            raise ValidationError("Registration session expired. Please start again.")
        
        # Ensure password has been set before allowing image upload
        if not registration_data.get('password_set') and not registration_data.get('password'):
            raise ValidationError("Please set your password first before uploading profile image.")
        
        # Save the file temporarily and store reference
        from django.conf import settings
        from django.core.files.storage import default_storage
        
        # Save file temporarily
        # Sanitize filename to avoid issues
        image_name = getattr(profile_image, 'name', 'image') or 'image'
        safe_filename = f"{signup_id}_{uuid.uuid4().hex[:8]}_{image_name}"
        # Remove any path separators from filename for security
        safe_filename = os.path.basename(safe_filename).replace('/', '_').replace('\\', '_')
        
        # Ensure we have a copy of registration_data to modify
        if not isinstance(registration_data, dict):
            registration_data = dict(registration_data) if registration_data else {}
        
        temp_path = default_storage.save(
            f'temp_profile_images/{safe_filename}',
            profile_image
        )
        
        # Store the path in cache
        registration_data['profile_image_path'] = temp_path
        cache.set(cache_key, registration_data, timeout=600)  # 10 minutes
        
        return Response({
            'uploaded': True,
            'message': 'Profile image uploaded successfully'
        }, status=status.HTTP_200_OK)
        
    except ValidationError:
        # Re-raise validation errors as-is
        raise
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        error_details = traceback.format_exc()
        logger.error(f"Unexpected error in user_upload_profile_image: {str(e)}\n{error_details}")
        raise ValidationError(f"Failed to upload profile image: {str(e)}")


@api_view(['POST'])
@permission_classes([AllowAny])
def user_set_password(request):
    """
    Set password during signup (stores in cache, doesn't create account yet).
    POST /api/v1/users/set-password/
    Body: {
        "mobile_number": "01234567890",
        "password": "password123"
    }
    """
    mobile_number = request.data.get('mobile_number')
    password = request.data.get('password')
    
    if not mobile_number or not password:
        raise ValidationError("mobile_number and password are required")
    
    # Check if user already exists (account was already created)
    if Customer.objects.filter(mobile_number=mobile_number).exists():
        # Account already exists - return success but don't create again
        return Response({
            'password_set': True,
            'message': 'Password already set. Account exists.',
            'account_exists': True
        }, status=status.HTTP_200_OK)
    
    # Get registration data from cache
    from django.core.cache import cache
    cache_key = f"registration_{mobile_number}"
    registration_data = cache.get(cache_key)
    
    if not registration_data:
        raise ValidationError("Registration session expired. Please start again.")
    
    if not registration_data.get('mobile_verified'):
        raise ValidationError("Mobile number must be verified first")
    
    # Store password in registration cache (hashed for security)
    from django.contrib.auth.hashers import make_password
    registration_data['password'] = make_password(password)
    registration_data['password_set'] = True
    
    # Update cache
    cache.set(cache_key, registration_data, timeout=600)  # Reset timeout
    
    return Response({
        'password_set': True,
        'message': 'Password set successfully. Continue with registration.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_complete_registration(request):
    """
    Complete registration - Step 3: Set password and create account.
    POST /api/v1/users/complete-registration/
    """
    mobile_number = request.data.get('mobile_number')
    password = request.data.get('password')
    
    if not mobile_number:
        raise ValidationError("mobile_number is required")
    
    # Check if user already exists first (account was already created)
    if Customer.objects.filter(mobile_number=mobile_number).exists():
        # Account already exists - return success with existing user data
        customer = Customer.objects.get(mobile_number=mobile_number)
        from django.core.cache import cache
        cache_key = f"registration_{mobile_number}"
        cache.delete(cache_key)  # Clear any stale cache
        
        # Generate JWT tokens for existing user
        refresh = RefreshToken()
        refresh['customer_id'] = str(customer.id)
        refresh['mobile'] = mobile_number
        refresh['user_id'] = str(customer.id)
        refresh.access_token['customer_id'] = str(customer.id)
        refresh.access_token['mobile'] = mobile_number
        refresh.access_token['user_id'] = str(customer.id)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserProfileSerializer(customer, context={'request': request}).data,
            'message': 'Account already exists. You have been logged in.',
            'account_exists': True
        }, status=status.HTTP_200_OK)
    
    # Get registration data from cache
    from django.core.cache import cache
    cache_key = f"registration_{mobile_number}"
    registration_data = cache.get(cache_key)
    
    if not registration_data:
        raise ValidationError("Registration session expired. Please start again.")
    
    if not registration_data.get('mobile_verified'):
        raise ValidationError("Mobile number must be verified first")
    
    # Get password from cache (preferred) or request
    # Password should be stored in cache from the set-password step
    cached_password = registration_data.get('password')
    if cached_password:
        # Use the hashed password from cache (preferred)
        password = cached_password
    elif not password:
        # No password in cache or request
        raise ValidationError("Password is required. Please set your password first.")
    # If password is provided in request but not in cache, use request password (will be hashed)
    
    # Get optional info from request if provided
    emergency_contact_name = request.data.get('emergency_contact_name') or registration_data.get('emergency_contact_name')
    emergency_contact_mobile = request.data.get('emergency_contact_mobile') or registration_data.get('emergency_contact_mobile')
    blood_type = request.data.get('blood_type') or registration_data.get('blood_type')
    national_id = (request.data.get('national_id') or registration_data.get('national_id') or '').strip()
    if national_id:
        # Check if national_id already exists (exclude current mobile_number in case of update)
        if Customer.objects.filter(national_id=national_id).exclude(mobile_number=mobile_number).exists():
            raise ValidationError("User with this National ID already exists")
    else:
        national_id = None
    
    # Check if email already exists (exclude current mobile_number in case of update)
    email = registration_data.get('email')
    if email:
        existing_customer_with_email = Customer.objects.filter(email=email).exclude(mobile_number=mobile_number).first()
        if existing_customer_with_email:
            raise ValidationError("User with this email already exists")
    
    # Get profile image if it was uploaded
    profile_image_path = registration_data.get('profile_image_path')
    
    nationality = (request.data.get('nationality') or registration_data.get('nationality') or '').strip()
    gender = (request.data.get('gender') or registration_data.get('gender') or '').strip()
    dob_input = request.data.get('date_of_birth') or registration_data.get('date_of_birth')
    date_of_birth = parse_date_value(dob_input)
    
    # Create customer
    customer_data = {
        'name': registration_data['name'],
        'email': email,
        'mobile_number': mobile_number,
        'phone': mobile_number,
        'national_id': national_id,
        'nationality': nationality or None,
        'gender': gender or None,
        'status': 'active',
        'emergency_contact_name': emergency_contact_name,
        'emergency_contact_mobile': emergency_contact_mobile,
        'blood_type': blood_type,
    }
    if date_of_birth:
        customer_data['date_of_birth'] = date_of_birth
    
    try:
        customer = Customer.objects.create(**customer_data)
    except IntegrityError as e:
        # Handle case where email or other unique constraint fails
        if 'email' in str(e):
            raise ValidationError("User with this email already exists")
        elif 'national_id' in str(e):
            raise ValidationError("User with this National ID already exists")
        else:
            raise ValidationError("A user with these details already exists")
    
    # Set password - if it's already hashed (from cache), use it directly, otherwise hash it
    from django.contrib.auth.hashers import is_password_usable, make_password
    if is_password_usable(password) and password.startswith('pbkdf2_'):
        # Password is already hashed, set it directly
        customer.password = password
    else:
        # Password is plain text, hash it
        customer.set_password(password)
    
    # Move profile image from temp location to customer profile if available
    if profile_image_path:
        from django.core.files.storage import default_storage
        try:
            # Open the temporary file
            if default_storage.exists(profile_image_path):
                with default_storage.open(profile_image_path, 'rb') as temp_file:
                    # Save to customer's profile_image field
                    customer.profile_image.save(
                        os.path.basename(profile_image_path),
                        temp_file,
                        save=False  # Don't save yet, we'll save once at the end
                    )
                # Delete temporary file
                default_storage.delete(profile_image_path)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to save profile image: {str(e)}")
            # Continue without profile image if there's an error
    
    # Save customer once with all updates (password and profile image)
    customer.save()
    
    # Refresh customer from DB to ensure profile_image is properly loaded
    customer.refresh_from_db()
    
    # Link any tickets assigned to this mobile number
    from tickets.models import Ticket
    assigned_tickets = Ticket.objects.filter(
        assigned_mobile=mobile_number,
        status='valid'
    ).exclude(customer=customer)
    
    # Also check for tickets with registration tokens for this phone number
    registration_tokens = TicketRegistrationToken.objects.filter(
        phone_number=mobile_number,
        used=False
    ).select_related('ticket')
    
    # Mark registration tokens as used and add their tickets to the list
    token_tickets = []
    for reg_token in registration_tokens:
        if reg_token.is_valid():
            token_tickets.append(reg_token.ticket)
            reg_token.mark_as_used()
    
    # Combine both sets of tickets
    all_assigned_tickets = list(assigned_tickets) + token_tickets
    
    if all_assigned_tickets:
        # Update customer but keep buyer as original purchaser
        # NEVER overwrite buyer field - it should always be the original purchaser
        # Only set buyer if it's null (for tickets created before buyer field was added)
        from tickets.models import TicketTransfer
        for ticket in all_assigned_tickets:
            # Store the original buyer before updating customer
            original_buyer = ticket.buyer if ticket.buyer else ticket.customer
            ticket.customer = customer
            # Only set buyer if it's null, otherwise preserve it
            if not ticket.buyer:
                ticket.buyer = original_buyer
            # Clear assigned fields since ticket is now owned by customer, not just assigned
            ticket.assigned_name = None
            ticket.assigned_mobile = None
            ticket.assigned_email = None
            ticket.save(update_fields=['customer', 'buyer', 'assigned_name', 'assigned_mobile', 'assigned_email'])
            
            # Update any pending TicketTransfer records for this ticket
            # (in case this ticket was transferred to this customer)
            TicketTransfer.objects.filter(
                ticket=ticket,
                to_customer__isnull=True,
                status='completed'
            ).update(to_customer=customer)
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Linked {len(all_assigned_tickets)} tickets to new customer {customer.id}")
    
    # Clear cache
    cache.delete(cache_key)
    
    # Generate JWT tokens
    refresh = RefreshToken()
    refresh['customer_id'] = str(customer.id)
    refresh['mobile'] = mobile_number
    refresh['user_id'] = str(customer.id)  # Set user_id for backward compatibility
    # Explicitly set customer_id on access token as well
    refresh.access_token['customer_id'] = str(customer.id)
    refresh.access_token['mobile'] = mobile_number
    refresh.access_token['user_id'] = str(customer.id)  # Set user_id for backward compatibility
    
    # Serialize user data with request context to get proper image URLs
    user_serializer = UserProfileSerializer(customer, context={'request': request})
    user_data = user_serializer.data
    
    # Log profile image for debugging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Registration completed for {mobile_number}, profile_image: {user_data.get('profile_image')}")
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': user_data,
        'message': 'Registration completed successfully'
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_registration_token(request):
    """
    Validate registration token and return ticket information.
    GET /api/v1/users/validate-registration-token/?token={token}
    """
    import logging
    import traceback
    logger = logging.getLogger(__name__)
    
    try:
        token = request.query_params.get('token')
        
        if not token:
            print("=" * 80)
            print("❌ TOKEN VALIDATION: Missing token parameter")
            print("=" * 80)
            logger.warning("Token validation: Missing token parameter")
            return Response({
                'error': {'code': 'MISSING_TOKEN', 'message': 'Token parameter is required'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Clean token
        original_token = token.strip()
        token = original_token
        
        # Django's query_params automatically URL-decodes, but let's try both encoded and decoded versions
        import urllib.parse
        
        print("=" * 80)
        print("🔍 TOKEN VALIDATION REQUEST")
        print(f"   Received token length: {len(token)}")
        print(f"   First 20 chars: {token[:20]}...")
        print(f"   Full token: {token}")
        print("=" * 80)
        logger.info(f"Token validation: Received token (length: {len(token)}, first 20 chars: {token[:20]}...)")
        
        # Try to find the token - try exact match first (Django should have already decoded it)
        registration_token = None
        try:
            registration_token = TicketRegistrationToken.objects.select_related('ticket', 'ticket__event', 'ticket__buyer').get(token=token)
            print(f"✅ TOKEN FOUND: Exact match! Token ID: {registration_token.id}")
            logger.info(f"Token validation: Found token with exact match (ID: {registration_token.id})")
        except TicketRegistrationToken.DoesNotExist:
            print(f"⚠️  TOKEN NOT FOUND: Trying other methods...")
            # Try URL-decoded version (in case it wasn't decoded)
            try:
                decoded_token = urllib.parse.unquote(original_token)
                if decoded_token != original_token:
                    print(f"   Trying URL-decoded version: {decoded_token[:20]}...")
                    logger.info(f"Token validation: Trying URL-decoded version (decoded from {len(original_token)} to {len(decoded_token)} chars)")
                    registration_token = TicketRegistrationToken.objects.select_related('ticket', 'ticket__event', 'ticket__buyer').get(token=decoded_token)
                    print(f"✅ TOKEN FOUND: With decoded version! Token ID: {registration_token.id}")
                    logger.info(f"Token validation: Found token with decoded version (ID: {registration_token.id})")
                    token = decoded_token
            except (TicketRegistrationToken.DoesNotExist, Exception) as e:
                print(f"   Decoded version failed: {str(e)}")
                # Try URL-encoded version (in case it needs encoding)
                try:
                    encoded_token = urllib.parse.quote(original_token, safe='')
                    if encoded_token != original_token:
                        print(f"   Trying URL-encoded version: {encoded_token[:20]}...")
                        logger.info(f"Token validation: Trying URL-encoded version")
                        registration_token = TicketRegistrationToken.objects.select_related('ticket', 'ticket__event', 'ticket__buyer').get(token=encoded_token)
                        print(f"✅ TOKEN FOUND: With encoded version! Token ID: {registration_token.id}")
                        logger.info(f"Token validation: Found token with encoded version (ID: {registration_token.id})")
                        token = encoded_token
                except (TicketRegistrationToken.DoesNotExist, Exception) as e2:
                    # Check if received token is a prefix of any stored token (handle truncation)
                    print(f"   Trying prefix match for truncation...")
                    # Get recent unused tokens and check if received token is a prefix
                    recent_tokens = TicketRegistrationToken.objects.filter(
                        used=False,
                        expires_at__gt=timezone.now()
                    ).order_by('-created_at')[:20]
                    
                    for t in recent_tokens:
                        if t.token.startswith(original_token):
                            print(f"   ✅ FOUND TOKEN BY PREFIX MATCH! Token ID: {t.id}")
                            print(f"      Stored token: {t.token}")
                            print(f"      Received (prefix): {original_token}")
                            registration_token = t
                            token = t.token  # Use full token
                            break
                    
                    if not registration_token:
                        # Log all recent tokens for debugging (last 10)
                        all_recent_tokens = TicketRegistrationToken.objects.order_by('-created_at')[:10]
                        print("=" * 80)
                        print("❌ TOKEN NOT FOUND: After trying all variations including prefix match")
                        print(f"   Original token received: {original_token}")
                        print(f"   Received token length: {len(original_token)}")
                        print(f"   Total tokens in DB: {TicketRegistrationToken.objects.count()}")
                        print(f"   Recent tokens (last 10):")
                        for t in all_recent_tokens:
                            print(f"      - ID: {t.id}, Token: {t.token}, Token length: {len(t.token)}, Phone: {t.phone_number}, Created: {t.created_at}, Used: {t.used}")
                            # Check if received token is a prefix of stored token
                            if t.token.startswith(original_token):
                                print(f"         ⚠️  RECEIVED TOKEN IS A PREFIX OF THIS TOKEN! (Truncation detected)")
                        print("=" * 80)
                        logger.warning(f"Token validation: Token not found after trying all variations. Original: {original_token[:30]}..., Recent tokens: {[(t.id, t.token[:20] + '...', t.phone_number, t.created_at) for t in all_recent_tokens]}")
                        return Response({
                            'valid': False,
                            'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid or expired token'}
                        }, status=status.HTTP_200_OK)
        
        if not registration_token:
            print("=" * 80)
            print("❌ TOKEN VALIDATION FAILED: No token found")
            print("=" * 80)
            return Response({
                'valid': False,
                'error': {'code': 'INVALID_TOKEN', 'message': 'Invalid or expired token'}
            }, status=status.HTTP_200_OK)
        
        print(f"   Token ID: {registration_token.id}")
        print(f"   Phone: {registration_token.phone_number}")
        print(f"   Used: {registration_token.used}")
        print(f"   Expires: {registration_token.expires_at}")
        print(f"   Is Valid: {registration_token.is_valid()}")
        logger.info(f"Token validation: Found token in database (ID: {registration_token.id}, used: {registration_token.used}, expires_at: {registration_token.expires_at})")
        
        # Check if token is valid (not expired and not used)
        if not registration_token.is_valid():
            print("=" * 80)
            print("❌ TOKEN INVALID:")
            print(f"   Used: {registration_token.used}")
            print(f"   Expired: {timezone.now() >= registration_token.expires_at}")
            print(f"   Current time: {timezone.now()}")
            print(f"   Expires at: {registration_token.expires_at}")
            print("=" * 80)
            logger.warning(f"Token validation: Token is invalid (used: {registration_token.used}, expired: {timezone.now() >= registration_token.expires_at})")
            return Response({
                'valid': False,
                'error': {'code': 'INVALID_TOKEN', 'message': 'Token has expired or has already been used'}
            }, status=status.HTTP_200_OK)
        
        print("=" * 80)
        print("✅ TOKEN VALIDATION SUCCESS!")
        print(f"   Event: {registration_token.ticket.event.title}")
        print(f"   Phone: {registration_token.phone_number}")
        print("=" * 80)
        
        ticket = registration_token.ticket
        purchaser_name = ticket.buyer.name if ticket.buyer and ticket.buyer.name else (
            f"{ticket.buyer.first_name} {ticket.buyer.last_name}".strip() if ticket.buyer else "Someone"
        )
        
        # Check if user is already registered
        user_already_registered = Customer.objects.filter(
            mobile_number=registration_token.phone_number,
            status='active'
        ).exists()
        
        if user_already_registered:
            print("=" * 80)
            print("⚠️  USER ALREADY REGISTERED!")
            print(f"   Phone: {registration_token.phone_number}")
            print("   Auto-logging in user...")
            print("=" * 80)
            logger.info(f"Token validation: User with phone {registration_token.phone_number} is already registered - auto-logging in")
            
            # Get the customer and generate JWT tokens for auto-login
            customer = Customer.objects.get(mobile_number=registration_token.phone_number, status='active')
            
            # Update last login
            customer.last_login = timezone.now()
            customer.save(update_fields=['last_login'])
            
            # Link any tickets assigned to this mobile number that aren't already linked
            assigned_tickets = Ticket.objects.filter(
                assigned_mobile=registration_token.phone_number,
                status='valid'
            ).exclude(customer=customer)
            
            # Also check for tickets with registration tokens for this phone number
            registration_tokens_for_user = TicketRegistrationToken.objects.filter(
                phone_number=registration_token.phone_number,
                used=False
            ).select_related('ticket')
            
            # Mark registration tokens as used and add their tickets to the list
            token_tickets = []
            for reg_token in registration_tokens_for_user:
                if reg_token.is_valid():
                    token_tickets.append(reg_token.ticket)
                    reg_token.mark_as_used()
            
            # Combine both sets of tickets
            all_assigned_tickets = list(assigned_tickets) + token_tickets
            
            if all_assigned_tickets:
                # Update customer but keep buyer as original purchaser
                from tickets.models import TicketTransfer
                for ticket in all_assigned_tickets:
                    # Store the original buyer before updating customer
                    original_buyer = ticket.buyer if ticket.buyer else ticket.customer
                    ticket.customer = customer
                    # Only set buyer if it's null, otherwise preserve it
                    if not ticket.buyer:
                        ticket.buyer = original_buyer
                    # Clear assigned fields since ticket is now owned by customer, not just assigned
                    ticket.assigned_name = None
                    ticket.assigned_mobile = None
                    ticket.assigned_email = None
                    ticket.save(update_fields=['customer', 'buyer', 'assigned_name', 'assigned_mobile', 'assigned_email'])
                    
                    # Update any pending TicketTransfer records for this ticket
                    TicketTransfer.objects.filter(
                        ticket=ticket,
                        to_customer__isnull=True,
                        status='completed'
                    ).update(to_customer=customer)
                
                logger.info(f"Linked {len(all_assigned_tickets)} tickets to customer {customer.id} via registration token")
            
            # Generate JWT tokens
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken()
            refresh['customer_id'] = str(customer.id)
            refresh['mobile'] = registration_token.phone_number
            refresh['user_id'] = str(customer.id)
            refresh.access_token['customer_id'] = str(customer.id)
            refresh.access_token['mobile'] = registration_token.phone_number
            refresh.access_token['user_id'] = str(customer.id)
            
            # Serialize user data
            user_serializer = UserProfileSerializer(customer, context={'request': request})
            user_data = user_serializer.data
            
            return Response({
                'valid': True,
                'user_already_registered': True,
                'auto_login': True,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user_data,
                'phone_number': registration_token.phone_number,
                'ticket_id': str(ticket.id),
                'event_name': ticket.event.title,
                'purchaser_name': purchaser_name,
                'ticket_number': ticket.ticket_number,
                'category': ticket.category,
                'message': 'You are already registered. You have been automatically logged in.'
            }, status=status.HTTP_200_OK)
        
        logger.info(f"Token validation: Token is valid for ticket {ticket.id}, phone: {registration_token.phone_number}")
        
        return Response({
            'valid': True,
            'user_already_registered': False,
            'phone_number': registration_token.phone_number,
            'ticket_id': str(ticket.id),
            'event_name': ticket.event.title,
            'purchaser_name': purchaser_name,
            'ticket_number': ticket.ticket_number,
            'category': ticket.category
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print("=" * 80)
        print("❌ TOKEN VALIDATION ERROR:")
        print(f"   Error: {str(e)}")
        print(f"   Type: {type(e).__name__}")
        print("   Traceback:")
        print(error_traceback)
        print("=" * 80)
        logger.error(f"Token validation error: {str(e)}\n{error_traceback}")
        return Response({
            'valid': False,
            'error': {'code': 'SERVER_ERROR', 'message': 'An error occurred while validating the token. Please try again.'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
@rate_limit_otp_request(limit=1, window=60)  # 1 request per 60 seconds
def user_login(request):
    """
    User login.
    POST /api/v1/users/login/
    """
    serializer = UserLoginSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(
            detail='Invalid input data.',
            details=serializer.errors
        )
    
    mobile_number = serializer.validated_data['mobile_number']
    password = serializer.validated_data['password']
    
    # Normalize mobile number to handle different formats
    normalized_mobile = normalize_mobile_number(mobile_number)
    
    # Try to find customer with normalized mobile number first
    from django.db.models import Q
    try:
        customer = Customer.objects.get(
            Q(mobile_number=normalized_mobile) | 
            Q(mobile_number=mobile_number) |
            Q(phone=normalized_mobile) |
            Q(phone=mobile_number)
        )
    except Customer.DoesNotExist:
        raise AuthenticationError(
            detail="Invalid mobile number or password",
            code="INVALID_CREDENTIALS"
        )
    except Customer.MultipleObjectsReturned:
        # If multiple found, prefer the one with matching mobile_number
        customer = Customer.objects.filter(
            Q(mobile_number=normalized_mobile) | 
            Q(mobile_number=mobile_number)
        ).first()
        if not customer:
            customer = Customer.objects.filter(
                Q(phone=normalized_mobile) | 
                Q(phone=mobile_number)
            ).first()
    
    if not customer.check_password(password):
        raise AuthenticationError(
            detail="Invalid mobile number or password",
            code="INVALID_CREDENTIALS"
        )
    
    # Check if customer is banned
    if customer.status == 'banned':
        raise AuthenticationError(
            detail="Your account has been banned. Please contact support for more information.",
            code="ACCOUNT_BANNED"
        )
    
    if customer.status != 'active':
        raise AuthenticationError(
            detail="Your account is not active. Please contact support.",
            code="ACCOUNT_INACTIVE"
        )
    
    # Create and send OTP (use customer's actual mobile_number from database)
    otp, success = create_and_send_otp(customer.mobile_number, 'login', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile_number': mobile_number
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_verify_login_otp(request):
    """
    Verify login OTP and return tokens.
    POST /api/v1/users/verify-login-otp/
    """
    serializer = UserOTPSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(
            detail='Invalid input data.',
            details=serializer.errors
        )
    
    mobile_number = serializer.validated_data['mobile_number']
    otp_code = serializer.validated_data['otp_code']
    
    # Normalize mobile number to handle different formats
    normalized_mobile = normalize_mobile_number(mobile_number)
    
    # Try to verify OTP with normalized mobile number first
    otp_verified = verify_otp(normalized_mobile, otp_code, 'login')
    if not otp_verified:
        # Fallback to original format
        otp_verified = verify_otp(mobile_number, otp_code, 'login')
    
    if not otp_verified:
        raise AuthenticationError("Invalid or expired OTP")
    
    # Try to find customer with normalized mobile number first
    try:
        customer = Customer.objects.get(mobile_number=normalized_mobile)
    except Customer.DoesNotExist:
        # If not found, try with original format as fallback
        try:
            customer = Customer.objects.get(mobile_number=mobile_number)
        except Customer.DoesNotExist:
            raise AuthenticationError("User not found")
    except Customer.DoesNotExist:
        raise AuthenticationError("User not found")
    
    # Check if customer is banned before completing login
    if customer.status == 'banned':
        raise AuthenticationError(
            detail="Your account has been banned. Please contact support for more information.",
            code="ACCOUNT_BANNED"
        )
    
    customer.last_login = timezone.now()
    customer.save(update_fields=['last_login'])
    
    # Link any tickets assigned to this mobile number that aren't already linked
    assigned_tickets = Ticket.objects.filter(
        assigned_mobile=mobile_number,
        status='valid'
    ).exclude(customer=customer)
    
    # Also check for tickets with registration tokens for this phone number
    registration_tokens = TicketRegistrationToken.objects.filter(
        phone_number=mobile_number,
        used=False
    ).select_related('ticket')
    
    # Mark registration tokens as used and add their tickets to the list
    token_tickets = []
    for reg_token in registration_tokens:
        if reg_token.is_valid():
            token_tickets.append(reg_token.ticket)
            reg_token.mark_as_used()
    
    # Combine both sets of tickets
    all_assigned_tickets = list(assigned_tickets) + token_tickets
    
    if all_assigned_tickets:
        # Update customer but keep buyer as original purchaser
        # NEVER overwrite buyer field - it should always be the original purchaser
        # Only set buyer if it's null (for tickets created before buyer field was added)
        from tickets.models import TicketTransfer
        for ticket in all_assigned_tickets:
            # Store the original buyer before updating customer
            original_buyer = ticket.buyer if ticket.buyer else ticket.customer
            ticket.customer = customer
            # Only set buyer if it's null, otherwise preserve it
            if not ticket.buyer:
                ticket.buyer = original_buyer
            # Clear assigned fields since ticket is now owned by customer, not just assigned
            ticket.assigned_name = None
            ticket.assigned_mobile = None
            ticket.assigned_email = None
            ticket.save(update_fields=['customer', 'buyer', 'assigned_name', 'assigned_mobile', 'assigned_email'])
            
            # Update any pending TicketTransfer records for this ticket
            # (in case this ticket was transferred to this customer)
            TicketTransfer.objects.filter(
                ticket=ticket,
                to_customer__isnull=True,
                status='completed'
            ).update(to_customer=customer)
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Linked {len(all_assigned_tickets)} tickets to customer {customer.id} on login")
    
    refresh = RefreshToken()
    refresh['customer_id'] = str(customer.id)
    refresh['mobile'] = mobile_number
    refresh['user_id'] = str(customer.id)  # Set user_id for backward compatibility
    # Explicitly set customer_id on access token as well
    refresh.access_token['customer_id'] = str(customer.id)
    refresh.access_token['mobile'] = mobile_number
    refresh.access_token['user_id'] = str(customer.id)  # Set user_id for backward compatibility
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserProfileSerializer(customer).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_refresh_token(request):
    """
    Refresh access token for customer users.
    POST /api/v1/users/refresh-token/
    """
    try:
        refresh_token_str = request.data.get('refresh')
        if not refresh_token_str:
            raise ValidationError("refresh token is required")
        
        # Parse and validate the refresh token
        try:
            refresh_token = RefreshToken(refresh_token_str)
        except Exception as e:
            raise AuthenticationError("Invalid refresh token")
        
        # Get customer_id from token
        customer_id = refresh_token.get('customer_id')
        if not customer_id:
            raise AuthenticationError("Token does not contain customer_id")
        
        # Verify customer exists
        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            raise AuthenticationError("Customer not found")
        
        # Create new access token with same claims
        new_refresh = RefreshToken()
        new_refresh['customer_id'] = str(customer.id)
        new_refresh['mobile'] = refresh_token.get('mobile', '')
        new_refresh['user_id'] = str(customer.id)  # Set user_id for backward compatibility
        # Explicitly set customer_id on access token as well
        new_refresh.access_token['customer_id'] = str(customer.id)
        new_refresh.access_token['mobile'] = refresh_token.get('mobile', '')
        new_refresh.access_token['user_id'] = str(customer.id)  # Set user_id for backward compatibility
        
        return Response({
            'access': str(new_refresh.access_token),
            'refresh': str(new_refresh),  # Return new refresh token if rotation is enabled
        }, status=status.HTTP_200_OK)
    except (ValidationError, AuthenticationError):
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error refreshing token: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'TOKEN_REFRESH_FAILED', 'message': 'Failed to refresh token'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_me(request):
    """
    Get current user profile.
    GET /api/v1/users/me/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    serializer = UserProfileSerializer(customer, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_card_details(request):
    """
    Get current user's NFC card details.
    GET /api/v1/users/me/card-details/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    
    # Get the user's active NFC card (if any)
    from nfc_cards.models import NFCCard
    nfc_card = NFCCard.objects.filter(customer=customer, status='active').first()
    
    # Extract customer first name
    customer_first_name = customer.name.split()[0] if customer.name else ""
    
    if nfc_card:
        # Ensure dates are always returned as strings (ISO format) or empty string if None
        card_data = {
            'card_number': nfc_card.serial_number,
            'card_status': nfc_card.status,
            'card_issue_date': nfc_card.issue_date.isoformat() if nfc_card.issue_date else "",
            'card_expiry_date': nfc_card.expiry_date.isoformat() if nfc_card.expiry_date else "",
        }
        wallet_data = {
            'wallet_status': 'active' if nfc_card.status == 'active' else 'inactive',
            'wallet_expiry_date': nfc_card.expiry_date.isoformat() if nfc_card.expiry_date else "",
        }
    else:
        card_data = None
        wallet_data = {
            'wallet_status': 'inactive',
            'wallet_expiry_date': "",
        }
    
    # Return response matching frontend interface
    return Response({
        'customer_first_name': customer_first_name,
        'nfc_card': card_data,
        'wallet': wallet_data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_events_list(request):
    """
    Public event listing (no auth required).
    GET /api/v1/public/events/
    Fetches all events from the same Event model used by admin dashboard.
    """
    # Show all events except cancelled ones (same as admin dashboard)
    events = Event.objects.exclude(status='cancelled').select_related('venue', 'category').prefetch_related('organizers', 'ticket_categories').order_by('-date', '-time')
    
    # Filtering
    category = request.query_params.get('category')
    location = request.query_params.get('location')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    search = request.query_params.get('search')
    
    if category:
        events = events.filter(category__name=category)
    if location:
        # Filter by venue address or city since Event doesn't have location field
        events = events.filter(
            Q(venue__address__icontains=location) | 
            Q(venue__city__icontains=location)
        )
    if date_from:
        events = events.filter(date__gte=date_from)
    if date_to:
        events = events.filter(date__lte=date_to)
    if search:
        events = events.filter(Q(title__icontains=search) | Q(description__icontains=search))
    
    serializer = PublicEventSerializer(events, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_event_detail(request, event_id):
    """
    Public event details.
    GET /api/v1/public/events/:id/
    """
    try:
        event = Event.objects.select_related('venue', 'category').prefetch_related('organizers', 'ticket_categories').get(id=event_id)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = PublicEventSerializer(event, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ticket_book(request):
    """
    Book tickets.
    POST /api/v1/tickets/book/
    """
    serializer = TicketBookingSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(
            detail='Invalid input data.',
            details=serializer.errors
        )
    
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        event = Event.objects.get(id=serializer.validated_data['event_id'])
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    category = serializer.validated_data['category']
    quantity = serializer.validated_data['quantity']
    payment_method = serializer.validated_data['payment_method']
    
    # Check if customer is a Black Card Customer
    is_black_card_customer = 'Black Card Customer' in (customer.labels or [])
    black_card_tickets_count = 0
    if is_black_card_customer:
        # Black Card customers can get max 2 tickets for free even if event is full
        black_card_tickets_count = min(quantity, 2)
    
    try:
        # Get ticket category from event's ticket categories
        from events.models import TicketCategory
        try:
            ticket_category = TicketCategory.objects.get(event=event, name=category)
            price_per_ticket = Decimal(str(ticket_category.price))
            
            # Check availability for this specific category (only for non-black-card tickets)
            available_tickets = ticket_category.tickets_available
            regular_tickets_needed = quantity - black_card_tickets_count
            # Explicitly check if event is sold out (0 tickets available) for non-black-card customers
            if regular_tickets_needed > 0 and available_tickets == 0:
                return Response({
                    'error': {'code': 'EVENT_SOLD_OUT', 'message': f'This event is sold out. No {category} tickets available.'}
                }, status=status.HTTP_400_BAD_REQUEST)
            if regular_tickets_needed > 0 and available_tickets < regular_tickets_needed:
                return Response({
                    'error': {'code': 'INSUFFICIENT_TICKETS', 'message': f'Not enough {category} tickets available. Only {available_tickets} tickets remaining.'}
                }, status=status.HTTP_400_BAD_REQUEST)
        except TicketCategory.DoesNotExist:
            # Fallback: use event's starting_price if ticket category doesn't exist
            if event.starting_price:
                price_per_ticket = Decimal(str(event.starting_price))
            else:
                price_per_ticket = Decimal('300.00')  # Default price when no categories configured
            
            # Check overall ticket availability (only for non-black-card tickets)
            available_tickets = event.tickets_available
            regular_tickets_needed = quantity - black_card_tickets_count
            # Explicitly check if event is sold out (0 tickets available) for non-black-card customers
            if regular_tickets_needed > 0 and available_tickets == 0:
                return Response({
                    'error': {'code': 'EVENT_SOLD_OUT', 'message': 'This event is sold out. No tickets available.'}
                }, status=status.HTTP_400_BAD_REQUEST)
            if regular_tickets_needed > 0 and available_tickets < regular_tickets_needed:
                return Response({
                    'error': {'code': 'INSUFFICIENT_TICKETS', 'message': f'Not enough tickets available. Only {available_tickets} tickets remaining.'}
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check per-customer ticket limit (only for non-black-card tickets)
        regular_tickets_needed = quantity - black_card_tickets_count
        if (not event.is_ticket_limit_unlimited) and regular_tickets_needed > event.ticket_limit:
            return Response({
                'error': {'code': 'TICKET_LIMIT_EXCEEDED', 'message': f'Maximum {event.ticket_limit} tickets per booking allowed.'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate total amount: black card tickets are free, regular tickets are paid
        total_amount = price_per_ticket * Decimal(str(regular_tickets_needed))
        
        # Create payment transaction (only if there are non-black-card tickets)
        # For Black Card customers with free tickets (total_amount = 0), create a completed transaction
        transaction = None
        if total_amount > 0:
            transaction = PaymentTransaction.objects.create(
                customer=customer,
                amount=total_amount,
                payment_method=payment_method,
                status='pending',
                transaction_id=str(uuid.uuid4())
            )
        elif total_amount == 0 and is_black_card_customer and payment_method == 'black_card_free':
            # Create a completed transaction for Black Card free tickets
            transaction = PaymentTransaction.objects.create(
                customer=customer,
                amount=Decimal('0.00'),
                payment_method='black_card_free',
                status='completed',
                transaction_id=f"BLACK_CARD_{uuid.uuid4().hex[:12].upper()}"
            )
        
        # Create tickets with assignment details
        tickets = []
        ticket_details = serializer.validated_data.get('ticket_details', [])
        
        for i in range(quantity):
            # Check if this is a black card ticket (first black_card_tickets_count tickets)
            is_black_card_ticket = is_black_card_customer and i < black_card_tickets_count
            
            # Start with default category and price from booking
            ticket_category = category
            ticket_price = price_per_ticket if not is_black_card_ticket else Decimal('0.00')
            
            # If ticket details provided and this ticket has details, use specific category/price for this ticket
            if ticket_details and i < len(ticket_details):
                detail = ticket_details[i]
                
                # Use ticket-specific category if provided
                if detail.get('category'):
                    ticket_category = detail.get('category')
                    # Get price for this specific category (but black card tickets are free)
                    if not is_black_card_ticket:
                        try:
                            from events.models import TicketCategory
                            specific_category = TicketCategory.objects.get(event=event, name=ticket_category)
                            ticket_price = Decimal(str(specific_category.price))
                        except TicketCategory.DoesNotExist:
                            # Fallback to default price if category not found
                            if event.starting_price:
                                ticket_price = Decimal(str(event.starting_price))
                            else:
                                ticket_price = Decimal('300.00')
                # Use ticket-specific price if provided (overrides category price, but black card tickets are free)
                elif detail.get('price') is not None and not is_black_card_ticket:
                    ticket_price = Decimal(str(detail.get('price')))
            
            ticket_data = {
                'event': event,
                'buyer': customer,  # Original buyer (who paid)
                'category': ticket_category,  # Use ticket-specific category
                'price': ticket_price,  # Use ticket-specific price (0 for black card tickets)
                'status': 'valid',
                'ticket_number': f"{event.id}-{customer.id}-{uuid.uuid4().hex[:8]}",
                'is_black_card': is_black_card_ticket,  # Mark black card tickets
            }
            
            # If ticket details provided and this ticket has details
            if ticket_details and i < len(ticket_details):
                detail = ticket_details[i]
                # Only assign if it's not the owner's ticket
                if not detail.get('is_owner', False):
                    ticket_data['assigned_name'] = detail.get('name', '').strip() or None
                    ticket_data['assigned_mobile'] = detail.get('mobile', '').strip() or None
                    ticket_data['assigned_email'] = detail.get('email', '').strip() or None
                    
                    # If ticket is assigned to someone else, try to link it to their account if they exist
                    if ticket_data['assigned_mobile']:
                        try:
                            assigned_customer = Customer.objects.filter(mobile_number=ticket_data['assigned_mobile']).first()
                            if assigned_customer:
                                # Link ticket to assigned customer, but keep buyer as original purchaser
                                ticket_data['customer'] = assigned_customer
                            else:
                                # Keep ticket with buyer until assigned person registers
                                ticket_data['customer'] = customer
                        except Exception as e:
                            import logging
                            logger = logging.getLogger(__name__)
                            logger.warning(f"Could not link ticket to assigned customer: {e}")
                            ticket_data['customer'] = customer
                else:
                    # Owner's ticket - customer is the buyer
                    ticket_data['customer'] = customer
                    # Save child information for owner tickets
                    # Check if has_child key exists in detail (not just default to False)
                    has_child_key_exists = 'has_child' in detail
                    has_child_value = detail.get('has_child', False)
                    child_age_value = detail.get('child_age')
                    
                    # Debug logging BEFORE processing
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"Booking ticket {i+1} - Owner ticket detail: {detail}")
                    logger.info(f"has_child key exists: {has_child_key_exists}, value: {has_child_value}, type: {type(has_child_value)}")
                    logger.info(f"child_age value: {child_age_value}, type: {type(child_age_value)}")
                    
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
                    
                    # Debug logging AFTER processing
                    logger.info(f"Booking ticket {i+1} - Final ticket_data: has_child={ticket_data.get('has_child')}, child_age={ticket_data.get('child_age')}")
            else:
                # No details provided - assume owner's ticket
                ticket_data['customer'] = customer
            
            ticket = Ticket.objects.create(**ticket_data)
            tickets.append(ticket)
            
            # Link ticket to payment transaction (skip for black card tickets as they're free)
            if not is_black_card_ticket and transaction:
                # Create individual transaction for each ticket to track payment status
                from payments.models import PaymentTransaction
                PaymentTransaction.objects.create(
                    customer=customer,
                    ticket=ticket,
                    amount=ticket_price,
                    payment_method=payment_method,
                    status='pending',  # Will be updated to 'completed' below
                    transaction_id=f"{transaction.transaction_id}-T{i+1}"
                )
            
            # Handle notifications for assigned tickets
            if ticket.assigned_mobile and ticket.assigned_mobile != customer.mobile_number:
                from core.notification_service import (
                    send_ticket_assignment_sms,
                    send_ticket_assignment_email,
                    is_egyptian_number,
                )
                import logging
                logger = logging.getLogger(__name__)
                
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
                    print("🆕 NEW USER DETECTED (SYNC BOOKING) - Creating registration token")
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
                    # Email will be sent immediately for synchronous bookings
                    send_ticket_assignment_email(ticket, purchaser_name, registration_token=registration_token)
        
        # Update transaction status (only if transaction exists)
        if transaction:
            transaction.status = 'completed'
            transaction.save()
            
            # Update all ticket payment transactions to completed
            from payments.models import PaymentTransaction
            PaymentTransaction.objects.filter(
                customer=customer,
                ticket__in=tickets,
                status='pending'
            ).update(status='completed')
        
        # Update customer stats (only count non-black-card tickets and amounts)
        customer.total_bookings += quantity
        customer.total_spent += total_amount
        customer.save(update_fields=['total_bookings', 'total_spent'])
        
        return Response({
            'message': 'Tickets booked successfully',
            'transaction_id': transaction.transaction_id if transaction else None,
            'tickets': TicketSerializer(tickets, many=True).data
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error booking tickets: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'BOOKING_ERROR', 'message': f'Failed to book tickets: {str(e)}'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_tickets_list(request):
    """
    Get user's tickets.
    GET /api/v1/users/tickets/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Get tickets where:
    # 1. Customer owns the ticket (customer = customer), OR
    # 2. Ticket is assigned to this customer (assigned_mobile matches)
    # EXCLUDE tickets bought for others (these go to dependants endpoint)
    # BUT exclude tickets that were transferred away by this customer
    from tickets.models import TicketTransfer
    
    # Get IDs of tickets that were transferred away by this customer
    # Check for completed transfers where this customer was the sender
    # This is the primary way to exclude transferred tickets
    import logging
    logger = logging.getLogger(__name__)
    
    transferred_ticket_ids = list(TicketTransfer.objects.filter(
        from_customer=customer,
        status='completed'
    ).values_list('ticket_id', flat=True))
    
    logger.info(f"[TICKETS_LIST] Customer {customer.id} - Found {len(transferred_ticket_ids)} transferred tickets: {transferred_ticket_ids}")
    
    # Build the base query - only tickets assigned to me (my own tickets)
    # Only include assigned_mobile filter if customer has a mobile number
    if customer.mobile_number:
        tickets_query = Ticket.objects.filter(
            Q(customer=customer) | 
            Q(assigned_mobile=customer.mobile_number)
        )
    else:
        tickets_query = Ticket.objects.filter(
            Q(customer=customer)
        )
    
    logger.info(f"[TICKETS_LIST] Found {tickets_query.count()} tickets before exclusion")
    
    # Exclude transferred tickets if any exist
    if transferred_ticket_ids:
        tickets_query = tickets_query.exclude(id__in=transferred_ticket_ids)
        logger.info(f"[TICKETS_LIST] After exclusion, found {tickets_query.count()} tickets")
    
    # Exclude tickets bought for others (these go to dependants endpoint)
    # Tickets where buyer is customer but assigned_mobile is set and different from customer's mobile
    try:
        tickets = tickets_query.exclude(
            Q(buyer=customer) & 
            Q(assigned_mobile__isnull=False) & 
            ~Q(assigned_mobile=customer.mobile_number)
        ).select_related('event', 'buyer', 'customer').order_by('-purchase_date')
        
        serializer = TicketSerializer(tickets, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        logger.error(f"[TICKETS_LIST] Error fetching tickets for customer {customer.id}: {str(e)}", exc_info=True)
        print(f"❌ [TICKETS_LIST] Error: {str(e)}")
        print(f"❌ [TICKETS_LIST] Traceback: {traceback.format_exc()}")
        return Response({
            'error': {'code': 'SERVER_ERROR', 'message': f'Failed to fetch tickets: {str(e)}'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_me_bookings(request):
    """
    Get user's bookings in paginated format.
    GET /api/v1/me/bookings/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Get pagination parameters
    page = int(request.query_params.get('page', 1))
    limit = int(request.query_params.get('limit', 10))
    offset = (page - 1) * limit
    
    # Get tickets grouped by event and purchase_date (same event + same day = same booking)
    # Include tickets where:
    # 1. Customer owns the ticket, OR
    # 2. Ticket is assigned to this customer, OR
    # 3. Customer bought ticket for someone else (assigned tickets)
    # BUT exclude tickets that were transferred away by this customer
    from tickets.models import TicketTransfer
    import logging
    logger = logging.getLogger(__name__)
    
    # Get IDs of tickets that were transferred away by this customer
    # Check for completed transfers where this customer was the sender
    # This is the primary way to exclude transferred tickets
    transferred_ticket_ids = list(TicketTransfer.objects.filter(
        from_customer=customer,
        status='completed'
    ).values_list('ticket_id', flat=True))
    
    # Debug logging
    logger.info(f"[BOOKINGS] Customer {customer.id} ({customer.mobile_number}) - Found {len(transferred_ticket_ids)} transferred tickets: {transferred_ticket_ids}")
    
    # Get tickets that belong to this customer (My Bookings)
    # Only include:
    # 1. Tickets owned by customer (customer = customer) AND not assigned to someone else
    # 2. Tickets assigned to customer (assigned_mobile matches customer's mobile)
    # EXCLUDE tickets bought for others (buyer=customer but assigned_mobile != customer.mobile_number)
    all_possible_tickets = Ticket.objects.filter(
        Q(customer=customer) | 
        Q(assigned_mobile=customer.mobile_number)
    )
    
    logger.info(f"[BOOKINGS] Customer {customer.id} - Found {all_possible_tickets.count()} possible tickets before exclusion")
    
    # Build the query with conditional exclusion
    tickets_query = all_possible_tickets
    
    # Exclude transferred tickets if any exist
    if transferred_ticket_ids:
        tickets_query = tickets_query.exclude(id__in=transferred_ticket_ids)
    
    # Exclude tickets bought for others (these go to dependants tab)
    # Tickets where buyer is customer but assigned_mobile is set and different from customer's mobile
    tickets = tickets_query.exclude(
        Q(buyer=customer) & 
        Q(assigned_mobile__isnull=False) & 
        ~Q(assigned_mobile=customer.mobile_number)
    ).select_related('event', 'event__venue').order_by('-purchase_date')
    
    logger.info(f"[BOOKINGS] Customer {customer.id} - Found {tickets.count()} tickets after exclusion")
    
    # Group tickets by event_id and purchase_date (day level) to create bookings
    bookings_dict = {}
    for ticket in tickets:
        if not ticket.event:
            continue
        
        # Group by event_id and purchase date (day level) - tickets bought on same day for same event are one booking
        purchase_date_str = ticket.purchase_date.strftime('%Y-%m-%d')
        order_key = f"{ticket.event.id}_{purchase_date_str}"
        
        if order_key not in bookings_dict:
            bookings_dict[order_key] = {
                'tickets': [],
                'purchase_date': ticket.purchase_date,
                'event': ticket.event,
            }
        bookings_dict[order_key]['tickets'].append(ticket)
    
    # Convert to list and sort by purchase_date
    bookings_list = list(bookings_dict.values())
    bookings_list.sort(key=lambda x: x['purchase_date'], reverse=True)
    
    # Apply pagination
    total_count = len(bookings_list)
    paginated_bookings = bookings_list[offset:offset + limit]
    
    # Transform to CustomerBookingItem format
    items = []
    for booking in paginated_bookings:
        tickets_list = booking['tickets']
        if not tickets_list:
            continue
        
        # Use first ticket's event info
        first_ticket = tickets_list[0]
        event = first_ticket.event
        
        # Calculate totals
        total_amount = sum(float(t.price) for t in tickets_list)
        quantity = len(tickets_list)
        unit_price = float(first_ticket.price) if tickets_list else 0
        
        # Get ticket category (use first ticket's category)
        ticket_category = first_ticket.category
        
        # Determine booking_status based on ticket statuses
        ticket_statuses = [t.status for t in tickets_list]
        if 'refunded' in ticket_statuses:
            booking_status = 'refunded'
        elif all(s == 'used' for s in ticket_statuses):
            booking_status = 'confirmed'  # All used = confirmed
        elif all(s in ['valid', 'used'] for s in ticket_statuses):
            booking_status = 'confirmed'
        else:
            booking_status = 'confirmed'
        
        # Get check-in time (use first ticket's check-in time if available)
        check_in_time = None
        for t in tickets_list:
            if t.check_in_time:
                check_in_time = t.check_in_time.isoformat()
                break
        
        # Try to get additional fees from payment transaction
        # Find payment transaction for this booking (same purchase date, same customer)
        from payments.models import PaymentTransaction
        additional_fees = {
            'card_cost': 0,
            'renewal_cost': 0,
            'subtotal': total_amount,  # Default to ticket total if not found
            'vat_amount': 0,
        }
        
        try:
            # Find payment transaction by matching purchase date and customer
            payment_date = first_ticket.purchase_date.date()
            payment_transactions = PaymentTransaction.objects.filter(
                customer=customer,
                created_at__date=payment_date,
                status='completed'
            ).order_by('-created_at')
            
            # Try to find transaction that matches this booking
            for transaction in payment_transactions:
                try:
                    gateway_response = json.loads(transaction.payment_gateway_response or '{}')
                    transaction_event_id = gateway_response.get('event_id')
                    if transaction_event_id and str(transaction_event_id) == str(event.id):
                        # Found matching transaction
                        fees = gateway_response.get('additional_fees', {})
                        additional_fees = {
                            'card_cost': float(fees.get('card_cost', 0)),
                            'renewal_cost': float(fees.get('renewal_cost', 0)),
                            'subtotal': float(fees.get('subtotal', total_amount)),
                            'vat_amount': float(fees.get('vat_amount', 0)),
                        }
                        break
                except (json.JSONDecodeError, ValueError, KeyError):
                    continue
        except Exception:
            pass  # If we can't find fees, use defaults
        
        items.append({
            'id': str(first_ticket.id),
            'event_id': str(event.id) if event else '',
            'event_title': event.title if event else '',
            'event_date': str(event.date) if event else '',
            'event_time': str(event.time) if event else '',
            'event_location': event.venue.address if event and event.venue else '',
            'order_id': order_key,
            'ticket_category': ticket_category,
            'quantity': quantity,
            'unit_price': unit_price,
            'total_amount': total_amount,
            'purchase_date': first_ticket.purchase_date.isoformat(),
            'status': booking_status,
            'qr_enabled': True,  # All tickets have QR codes
            'check_in_time': check_in_time,
            'dependents': [],  # TODO: Add dependents if needed
            'additional_fees': additional_fees,  # Include additional fees
        })
    
    return Response({
        'items': items,
        'page': str(page),
        'limit': str(limit),
        'count': str(total_count),
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_dependants_tickets(request):
    """
    Get tickets bought for others (dependants tickets).
    GET /api/v1/users/dependants-tickets/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Get pagination parameters
    page = int(request.query_params.get('page', 1))
    limit = int(request.query_params.get('limit', 10))
    offset = (page - 1) * limit
    
    # Get tickets bought for others (buyer is customer but assigned_mobile is different from customer's mobile)
    from tickets.models import TicketTransfer
    import logging
    logger = logging.getLogger(__name__)
    
    # Get IDs of tickets that were transferred away by this customer
    transferred_ticket_ids = list(TicketTransfer.objects.filter(
        from_customer=customer,
        status='completed'
    ).values_list('ticket_id', flat=True))
    
    # Get tickets bought for others
    # Tickets where buyer is customer but assigned_mobile is set and different from customer's mobile
    # EXCLUDE tickets that have been claimed (where customer is set and customer != buyer)
    if customer.mobile_number:
        dependants_tickets = Ticket.objects.filter(
            Q(buyer=customer) & 
            Q(assigned_mobile__isnull=False) & 
            ~Q(assigned_mobile=customer.mobile_number)
        )
    else:
        # If customer has no mobile number, only filter by buyer
        dependants_tickets = Ticket.objects.filter(
            Q(buyer=customer) & 
            Q(assigned_mobile__isnull=False)
        )
    
    # Exclude transferred tickets
    if transferred_ticket_ids:
        dependants_tickets = dependants_tickets.exclude(id__in=transferred_ticket_ids)
    
    # Exclude claimed tickets (where customer is set and different from buyer - ticket was claimed by assigned person)
    # When a ticket is claimed, customer is set to the recipient, so we exclude those
    # We only want tickets where customer is null (not claimed) OR customer is the buyer (still owned by buyer)
    dependants_tickets = dependants_tickets.exclude(
        Q(customer__isnull=False) & ~Q(customer=customer)
    )
    
    try:
        dependants_tickets = dependants_tickets.select_related('event', 'event__venue', 'customer', 'buyer').order_by('-purchase_date')
        
        total_count = dependants_tickets.count()
        logger.info(f"[DEPENDANTS_TICKETS] Customer {customer.id} - Found {total_count} dependants tickets")
        
        # Apply pagination to individual tickets (not grouped)
        paginated_tickets = list(dependants_tickets[offset:offset + limit])
        logger.info(f"[DEPENDANTS_TICKETS] Paginated to {len(paginated_tickets)} tickets (offset={offset}, limit={limit})")
        
        # Serialize individual tickets
        try:
            serializer = TicketSerializer(paginated_tickets, many=True, context={'request': request})
            tickets_data = serializer.data
            logger.info(f"[DEPENDANTS_TICKETS] Successfully serialized {len(tickets_data)} tickets")
        except Exception as serialization_error:
            logger.error(f"[DEPENDANTS_TICKETS] Serialization error: {str(serialization_error)}", exc_info=True)
            print(f"❌ [DEPENDANTS_TICKETS] Serialization error: {str(serialization_error)}")
            import traceback
            print(f"❌ [DEPENDANTS_TICKETS] Traceback: {traceback.format_exc()}")
            raise
        
        # Transform to include dependent info and claim status
        items = []
        for idx, ticket_data in enumerate(tickets_data):
            try:
                ticket_obj = paginated_tickets[idx] if idx < len(paginated_tickets) else None
                
                # Skip tickets without events
                if not ticket_obj or not ticket_obj.event:
                    logger.warning(f"[DEPENDANTS_TICKETS] Skipping ticket {ticket_obj.id if ticket_obj else 'unknown'} - no event")
                    continue
                
                # Get dependent info from the ticket
                dependent_name = ticket_data.get('assigned_name') or ''
                dependent_mobile = ticket_data.get('assigned_mobile') or ''
                
                # Check if ticket is claimed
                is_claimed = False
                if ticket_obj:
                    if ticket_obj.customer and ticket_obj.customer != customer:
                        is_claimed = True
                        # If claimed, get customer info instead of assigned info
                        if ticket_obj.customer:
                            dependent_name = ticket_obj.customer.name or f"{ticket_obj.customer.first_name} {ticket_obj.customer.last_name}".strip() or ticket_data.get('assigned_name', '')
                            dependent_mobile = ticket_obj.customer.mobile_number or ticket_data.get('assigned_mobile', '')
                
                # Determine claim status
                claim_status = 'claimed' if is_claimed else 'pending'
                
                # Get event location from ticket object
                event_location = ''
                if ticket_obj and ticket_obj.event and ticket_obj.event.venue:
                    event_location = ticket_obj.event.venue.address or ''
                
                # Build the item dictionary explicitly to avoid any serialization issues
                item = {
                    'id': ticket_data.get('id'),
                    'ticket_id': ticket_data.get('id'),  # Add ticket_id for reference
                    'event_id': ticket_data.get('event_id'),
                    'event_title': ticket_data.get('event_title'),
                    'event_date': str(ticket_data.get('event_date')) if ticket_data.get('event_date') else None,
                    'event_time': str(ticket_data.get('event_time')) if ticket_data.get('event_time') else None,
                    'event_location': event_location,
                    'category': ticket_data.get('category'),
                    'price': float(ticket_data.get('price', 0)) if ticket_data.get('price') else 0,
                    'status': ticket_data.get('status'),
                    'purchase_date': ticket_data.get('purchase_date'),
                    'ticket_number': ticket_data.get('ticket_number'),
                    'check_in_time': ticket_data.get('check_in_time'),
                    'assigned_name': ticket_data.get('assigned_name'),
                    'assigned_mobile': ticket_data.get('assigned_mobile'),
                    'assigned_email': ticket_data.get('assigned_email'),
                    'buyer_name': ticket_data.get('buyer_name'),
                    'buyer_mobile': ticket_data.get('buyer_mobile'),
                    'buyer_email': ticket_data.get('buyer_email'),
                    'is_assigned_to_me': ticket_data.get('is_assigned_to_me'),
                    'is_assigned_to_other': ticket_data.get('is_assigned_to_other'),
                    'needs_claiming': ticket_data.get('needs_claiming'),
                    'dependent_name': dependent_name,
                    'dependent_mobile': dependent_mobile,
                    'is_claimed': is_claimed,
                    'status': claim_status,  # Override with our computed claim status
                }
                items.append(item)
            except Exception as item_error:
                logger.error(f"[DEPENDANTS_TICKETS] Error processing ticket at index {idx}: {str(item_error)}", exc_info=True)
                print(f"❌ [DEPENDANTS_TICKETS] Error processing ticket at index {idx}: {str(item_error)}")
                continue  # Skip this ticket and continue with the next one
        
        return Response({
            'items': items,
            'page': str(page),
            'limit': str(limit),
            'count': str(total_count),
        }, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        logger.error(f"[DEPENDANTS_TICKETS] Error fetching dependants tickets for customer {customer.id}: {str(e)}", exc_info=True)
        print(f"❌ [DEPENDANTS_TICKETS] Error: {str(e)}")
        print(f"❌ [DEPENDANTS_TICKETS] Traceback: {traceback.format_exc()}")
        return Response({
            'error': {'code': 'SERVER_ERROR', 'message': f'Failed to fetch dependants tickets: {str(e)}'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_nfc_cards_list(request):
    """
    Get user's NFC cards.
    GET /api/v1/users/nfc-cards/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    cards = NFCCard.objects.filter(customer=customer)
    serializer = NFCCardSerializer(cards, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_nfc_card_status(request):
    """
    Check if user has an active NFC card or has already paid for NFC card fee
    (to determine if NFC card fee should be charged).
    GET /api/v1/users/nfc-cards/status/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Check if customer has any active NFC card
    has_active_card = NFCCard.objects.filter(
        customer=customer,
        status='active'
    ).exists()
    
    # Check if customer has already made any completed payment transaction
    # If they have, they've already paid both the NFC card fee and renewal cost in their first purchase
    has_paid_card_fee = PaymentTransaction.objects.filter(
        customer=customer,
        status='completed'
    ).exists()
    
    # Customer needs to pay card fee only if:
    # 1. They don't have an active NFC card AND
    # 2. They haven't made any completed payment transactions yet
    needs_card_fee = not has_active_card and not has_paid_card_fee
    
    # Customer needs to pay renewal cost only if they haven't made any completed payment transactions yet
    # (Both card fee and renewal cost are charged together in the first purchase)
    needs_renewal_cost = not has_paid_card_fee
    
    return Response({
        'has_nfc_card': has_active_card,
        'has_paid_card_fee': has_paid_card_fee,
        'needs_card_fee': needs_card_fee,
        'needs_renewal_cost': needs_renewal_cost
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def user_dependents(request):
    """
    Get or add user's dependents.
    GET /api/v1/users/dependents/
    POST /api/v1/users/dependents/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        dependents = Dependent.objects.filter(customer=customer)
        serializer = DependentSerializer(dependents, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    # POST - Add dependent
    serializer = DependentSerializer(data={
        'customer': customer.id,
        **request.data
    })
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    raise ValidationError(
        detail='Invalid input data.',
        details=serializer.errors
    )


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_favorites(request, event_id=None):
    """
    Get, add, or remove favorites.
    GET /api/v1/users/favorites/
    POST /api/v1/users/favorites/
    DELETE /api/v1/users/favorites/:event_id/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        favorites = Favorite.objects.filter(customer=customer).select_related('event')
        serializer = FavoriteSerializer(favorites, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    if request.method == 'POST':
        event_id = request.data.get('event_id')
        if not event_id:
            raise ValidationError("event_id is required")
        
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
            }, status=status.HTTP_404_NOT_FOUND)
        
        favorite, created = Favorite.objects.get_or_create(customer=customer, event=event)
        serializer = FavoriteSerializer(favorite)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    # DELETE
    if event_id:
        try:
            favorite = Favorite.objects.get(customer=customer, event_id=event_id)
            favorite.delete()
            return Response({'message': 'Favorite removed'}, status=status.HTTP_200_OK)
        except Favorite.DoesNotExist:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Favorite not found'}
            }, status=status.HTTP_404_NOT_FOUND)
    
    raise ValidationError("event_id is required")


# Additional endpoints from plan

@api_view(['POST'])
@permission_classes([AllowAny])
@rate_limit_otp_request(limit=1, window=60)  # 1 request per 60 seconds
def user_forgot_password_request_otp(request):
    """
    Request password reset OTP.
    POST /api/v1/users/forgot-password/request-otp/
    """
    try:
        # Handle both dict and string request.data
        if isinstance(request.data, str):
            import json
            try:
                data = json.loads(request.data)
            except json.JSONDecodeError:
                data = {}
        else:
            data = request.data
        
        mobile_number = data.get('mobile_number') if isinstance(data, dict) else None
        if not mobile_number:
            raise ValidationError("mobile_number is required")
        
        import logging
        logger = logging.getLogger(__name__)
        
        # Check if customer exists
        customer_exists = Customer.objects.filter(mobile_number=mobile_number).exists()
        
        # Always send OTP (for security - don't reveal if user exists)
        try:
            logger.info(f"Attempting to send OTP to {mobile_number} for forgot_password (customer exists: {customer_exists})")
            
            otp, success = create_and_send_otp(mobile_number, 'forgot_password', app_name="TicketRunners")
            
            logger.info(f"OTP created: {otp.code}, SMS success: {success}")
            
            if not success:
                logger.warning(f"OTP created but SMS failed for {mobile_number}")
                return Response({
                    'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP. Please try again later.'}
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            logger.info(f"OTP successfully sent to {mobile_number}")
            # Always return the same message for security (don't reveal if user exists)
            return Response({
                'message': 'If the mobile number exists, an OTP has been sent'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            # Log the error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending OTP for {mobile_number}: {str(e)}", exc_info=True)
            return Response({
                'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP. Please try again later.'}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except ValidationError:
        raise
    except Exception as e:
        # Catch any other unexpected errors
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error in forgot password request: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'INTERNAL_ERROR', 'message': 'An error occurred. Please try again later.'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_verify_password_reset_otp(request):
    """
    Verify password reset OTP and return a reset token.
    POST /api/v1/users/forgot-password/verify-otp/
    """
    try:
        # Handle both dict and string request.data
        if isinstance(request.data, str):
            import json
            try:
                data = json.loads(request.data)
            except json.JSONDecodeError:
                data = {}
        else:
            data = request.data
        
        mobile_number = data.get('mobile_number') if isinstance(data, dict) else None
        otp_code = data.get('otp_code') if isinstance(data, dict) else None
        
        if not mobile_number or not otp_code:
            raise ValidationError("mobile_number and otp_code are required")
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Verifying password reset OTP for {mobile_number}")
        
        # Check if there are any recent OTPs (for better error messages)
        from core.models import OTP
        from django.utils import timezone
        recent_otps = OTP.objects.filter(
            phone_number=mobile_number,
            purpose='forgot_password'
        ).order_by('-created_at')[:1]
        
        # Verify OTP
        if not verify_otp(mobile_number, otp_code, 'forgot_password'):
            logger.warning(f"Invalid OTP for {mobile_number}")
            
            # Provide more helpful error message
            if recent_otps.exists():
                latest_otp = recent_otps.first()
                if latest_otp.used:
                    error_msg = "This OTP has already been used. Please request a new OTP."
                elif latest_otp.expires_at < timezone.now():
                    error_msg = "This OTP has expired. Please request a new OTP."
                else:
                    error_msg = "Invalid OTP code. Please check and try again."
            else:
                error_msg = "No OTP found. Please request a new OTP first."
            
            # Use ValidationError instead of AuthenticationError for OTP validation failures
            # This returns 400 instead of 401, which is more appropriate
            raise ValidationError(error_msg)
        
        # Check if customer exists
        try:
            customer = Customer.objects.get(mobile_number=mobile_number)
        except Customer.DoesNotExist:
            logger.warning(f"Customer not found for {mobile_number}")
            raise AuthenticationError("User not found")
        
        # Generate a simple reset token (using a hash of customer ID + timestamp)
        from django.utils import timezone
        from datetime import timedelta
        import hashlib
        import secrets
        
        # Create a secure token
        reset_token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(minutes=10)  # Token valid for 10 minutes
        
        # Store token in customer's session or create a simple token storage
        # For simplicity, we'll use a hash-based approach
        # In production, you might want to use Django's password reset tokens or a separate model
        
        logger.info(f"Password reset OTP verified for {mobile_number}, token generated")
        
        return Response({
            'password_reset_token': reset_token,
            'expires_in_seconds': 600  # 10 minutes
        }, status=status.HTTP_200_OK)
    except ValidationError:
        raise
    except AuthenticationError:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error verifying password reset OTP: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'VERIFICATION_FAILED', 'message': 'Failed to verify OTP. Please try again.'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_reset_password(request):
    """
    Reset password with OTP.
    POST /api/v1/users/reset-password/
    """
    try:
        # Handle both dict and string request.data
        if isinstance(request.data, str):
            import json
            try:
                data = json.loads(request.data)
            except json.JSONDecodeError:
                data = {}
        else:
            data = request.data
        
        mobile_number = data.get('mobile_number') if isinstance(data, dict) else None
        otp_code = data.get('otp_code') if isinstance(data, dict) else None
        new_password = data.get('new_password') if isinstance(data, dict) else None
        
        if not all([mobile_number, otp_code, new_password]):
            raise ValidationError("mobile_number, otp_code, and new_password are required")
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Resetting password for {mobile_number}")
        
        # Verify OTP
        if not verify_otp(mobile_number, otp_code, 'forgot_password'):
            logger.warning(f"Invalid OTP for password reset: {mobile_number}")
            raise AuthenticationError("Invalid or expired OTP")
        
        try:
            customer = Customer.objects.get(mobile_number=mobile_number)
        except Customer.DoesNotExist:
            logger.warning(f"Customer not found for password reset: {mobile_number}")
            raise AuthenticationError("User not found")
        
        customer.set_password(new_password)
        customer.save()
        
        logger.info(f"Password reset successfully for {mobile_number}")
        return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)
    except ValidationError:
        raise
    except AuthenticationError:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error resetting password: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'RESET_FAILED', 'message': 'Failed to reset password. Please try again.'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_save_optional_info(request):
    """
    Save optional information during signup (before account creation).
    POST /api/v1/users/save-optional-info/
    Body can include optional fields like blood_type, emergency contact info,
    nationality, gender, and date_of_birth.
    """
    signup_id = request.data.get('signup_id')  # This is mobile_number
    if not signup_id:
        raise ValidationError("signup_id is required")
    
    # Convert signup_id to string (it might be sent as integer from frontend)
    signup_id = str(signup_id).strip()
    
    # Check if user already exists (account was already created)
    if Customer.objects.filter(mobile_number=signup_id).exists():
        # Account already exists - update customer record directly
        customer = Customer.objects.get(mobile_number=signup_id)
        update_fields = []
        
        if request.data.get('blood_type'):
            customer.blood_type = request.data.get('blood_type')
            update_fields.append('blood_type')
        if request.data.get('emergency_contact_name'):
            customer.emergency_contact_name = request.data.get('emergency_contact_name')
            update_fields.append('emergency_contact_name')
        if request.data.get('emergency_contact_mobile'):
            customer.emergency_contact_mobile = request.data.get('emergency_contact_mobile')
            update_fields.append('emergency_contact_mobile')
        if request.data.get('nationality'):
            customer.nationality = request.data.get('nationality')
            update_fields.append('nationality')
        if request.data.get('gender'):
            customer.gender = request.data.get('gender')
            update_fields.append('gender')
        dob_value = parse_date_value(request.data.get('date_of_birth'))
        if dob_value:
            customer.date_of_birth = dob_value
            update_fields.append('date_of_birth')
        
        if update_fields:
            customer.save(update_fields=update_fields)
        
        return Response({
            'optional_saved': True,
            'message': 'Optional information saved successfully',
            'account_exists': True
        }, status=status.HTTP_200_OK)
    
    # Store in registration cache
    from django.core.cache import cache
    cache_key = f"registration_{signup_id}"
    registration_data = cache.get(cache_key)
    
    if not registration_data:
        # Cache expired - check if account was created (might have been created in another session)
        if Customer.objects.filter(mobile_number=signup_id).exists():
            # Account exists, update it directly
            customer = Customer.objects.get(mobile_number=signup_id)
            update_fields = []
            
            if request.data.get('blood_type'):
                customer.blood_type = request.data.get('blood_type')
                update_fields.append('blood_type')
            if request.data.get('emergency_contact_name'):
                customer.emergency_contact_name = request.data.get('emergency_contact_name')
                update_fields.append('emergency_contact_name')
            if request.data.get('emergency_contact_mobile'):
                customer.emergency_contact_mobile = request.data.get('emergency_contact_mobile')
                update_fields.append('emergency_contact_mobile')
            if request.data.get('nationality'):
                customer.nationality = request.data.get('nationality')
                update_fields.append('nationality')
            if request.data.get('gender'):
                customer.gender = request.data.get('gender')
                update_fields.append('gender')
            dob_value = parse_date_value(request.data.get('date_of_birth'))
            if dob_value:
                customer.date_of_birth = dob_value
                update_fields.append('date_of_birth')
            
            if update_fields:
                customer.save(update_fields=update_fields)
            
            return Response({
                'optional_saved': True,
                'message': 'Optional information saved successfully',
                'account_exists': True
            }, status=status.HTTP_200_OK)
        
        raise ValidationError("Registration session expired. Please start again.")
    
    # Ensure we have a copy of registration_data to modify
    if not isinstance(registration_data, dict):
        registration_data = dict(registration_data) if registration_data else {}
    
    # Update optional info in cache
    if request.data.get('blood_type'):
        registration_data['blood_type'] = request.data.get('blood_type')
    if request.data.get('emergency_contact_name'):
        registration_data['emergency_contact_name'] = request.data.get('emergency_contact_name')
    if request.data.get('emergency_contact_mobile'):
        registration_data['emergency_contact_mobile'] = request.data.get('emergency_contact_mobile')
    if request.data.get('nationality'):
        registration_data['nationality'] = request.data.get('nationality')
    if request.data.get('gender'):
        registration_data['gender'] = request.data.get('gender')
    dob_value = parse_date_value(request.data.get('date_of_birth'))
    if dob_value:
        registration_data['date_of_birth'] = dob_value.isoformat()
    
    cache.set(cache_key, registration_data, timeout=600)  # Reset timeout
    
    return Response({
        'optional_saved': True,
        'message': 'Optional information saved successfully'
    }, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def user_profile_update(request):
    """
    Update user profile.
    PUT /api/v1/users/profile/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Handle profile image upload separately (if provided)
    profile_image = request.FILES.get('profile_image')
    if profile_image:
        # Validate file type - accept all common image formats
        allowed_types = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'image/bmp', 'image/svg+xml', 'image/tiff', 'image/x-icon',
            'image/vnd.microsoft.icon', 'image/x-ms-bmp', 'image/x-png', 'image/x-icon'
        ]
        # Also check file extension as fallback
        import os
        file_extension = os.path.splitext(profile_image.name)[1].lower().lstrip('.')
        allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'tif', 'ico']
        
        if profile_image.content_type not in allowed_types and file_extension not in allowed_extensions:
            raise ValidationError("Invalid file type. Please upload a valid image file.")
        
        # Validate file size (5MB)
        max_size = 5 * 1024 * 1024
        if profile_image.size > max_size:
            raise ValidationError("Image size must be less than 5MB.")
        
        # Save profile image
        customer.profile_image = profile_image
        customer.save(update_fields=['profile_image'])
    
    # Handle other profile fields
    # Create a mutable copy of request.data
    data = request.data.copy()
    # Remove profile_image from data if it exists (already handled above)
    if 'profile_image' in data:
        del data['profile_image']
    
    serializer = UserProfileSerializer(customer, data=data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    raise ValidationError(
        detail='Invalid input data.',
        details=serializer.errors
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit_otp_request(limit=5, window=60)  # 5 requests per 60 seconds (more lenient for resend)
def user_send_current_mobile_otp(request):
    """
    Send OTP to current mobile number for verification.
    POST /api/v1/users/change-mobile/send-current-otp/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if not customer.mobile_number:
        return Response({
            'error': {'code': 'NO_MOBILE', 'message': 'No mobile number found'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Send OTP to current mobile number using login purpose (for verification)
    otp, success = create_and_send_otp(customer.mobile_number, 'login', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to your current mobile number',
        'mobile_number': customer.mobile_number
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit_otp_request(limit=5, window=60)  # 5 requests per 60 seconds (more lenient for resend)
def user_send_new_mobile_otp(request):
    """
    Send OTP to new mobile number for mobile change.
    POST /api/v1/users/change-mobile/send-new-otp/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    new_mobile = request.data.get('new_mobile')
    if not new_mobile:
        raise ValidationError("new_mobile is required")
    
    # Check if new mobile is same as current
    if customer.mobile_number == new_mobile:
        return Response({
            'error': {'code': 'SAME_MOBILE', 'message': 'New mobile number must be different from current'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if new mobile is already taken
    if Customer.objects.filter(mobile_number=new_mobile).exclude(id=customer_id).exists():
        return Response({
            'error': {'code': 'MOBILE_TAKEN', 'message': 'This mobile number is already registered'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Send OTP to new mobile number using mobile_change purpose
    otp, success = create_and_send_otp(new_mobile, 'mobile_change', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to new mobile number',
        'new_mobile': new_mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_verify_and_change_mobile(request):
    """
    Verify OTPs and change mobile number.
    POST /api/v1/users/change-mobile/verify/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    current_mobile_otp = request.data.get('current_mobile_otp')
    new_mobile = request.data.get('new_mobile')
    new_mobile_otp = request.data.get('new_mobile_otp')
    
    if not all([current_mobile_otp, new_mobile, new_mobile_otp]):
        raise ValidationError("current_mobile_otp, new_mobile, and new_mobile_otp are required")
    
    # Verify current mobile OTP (using login purpose)
    if not verify_otp(customer.mobile_number, current_mobile_otp, 'login'):
        raise AuthenticationError("Invalid or expired OTP for current mobile number")
    
    # Verify new mobile OTP (using mobile_change purpose)
    if not verify_otp(new_mobile, new_mobile_otp, 'mobile_change'):
        raise AuthenticationError("Invalid or expired OTP for new mobile number")
    
    # Check if new mobile is already taken
    if Customer.objects.filter(mobile_number=new_mobile).exclude(id=customer_id).exists():
        return Response({
            'error': {'code': 'MOBILE_TAKEN', 'message': 'This mobile number is already registered'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update mobile number
    customer.mobile_number = new_mobile
    customer.save(update_fields=['mobile_number'])
    
    return Response({
        'message': 'Mobile number updated successfully',
        'mobile_number': new_mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit_otp_request(limit=5, window=60)  # 5 requests per 60 seconds (more lenient for resend)
def user_send_current_email_otp(request):
    """
    Send OTP to current email address for verification.
    POST /api/v1/users/change-email/send-current-otp/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if not customer.email:
        return Response({
            'error': {'code': 'NO_EMAIL', 'message': 'No email address found'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Send OTP to current email using email_verification purpose
    otp, success = create_and_send_otp(customer.email, 'email_verification', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to your current email address',
        'email': customer.email
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@rate_limit_otp_request(limit=5, window=60)  # 5 requests per 60 seconds (more lenient for resend)
def user_send_new_email_otp(request):
    """
    Send OTP to new email address for email change.
    POST /api/v1/users/change-email/send-new-otp/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    new_email = request.data.get('new_email')
    if not new_email:
        raise ValidationError("new_email is required")
    
    # Validate email format
    from django.core.validators import validate_email
    try:
        validate_email(new_email)
    except ValidationError:
        return Response({
            'error': {'code': 'INVALID_EMAIL', 'message': 'Invalid email format'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if new email is same as current
    if new_email.lower() == customer.email.lower():
        return Response({
            'error': {'code': 'SAME_EMAIL', 'message': 'New email must be different from current email'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if new email is already taken
    if Customer.objects.filter(email__iexact=new_email).exclude(id=customer_id).exists():
        return Response({
            'error': {'code': 'EMAIL_TAKEN', 'message': 'This email address is already registered'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Send OTP to new email using email_verification purpose
    otp, success = create_and_send_otp(new_email, 'email_verification', app_name="TicketRunners")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to your new email address',
        'new_email': new_email
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_verify_and_change_email(request):
    """
    Verify OTPs and change email address.
    POST /api/v1/users/change-email/verify/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    current_email_otp = request.data.get('current_email_otp')
    new_email = request.data.get('new_email')
    new_email_otp = request.data.get('new_email_otp')
    
    if not all([current_email_otp, new_email, new_email_otp]):
        raise ValidationError("current_email_otp, new_email, and new_email_otp are required")
    
    # Verify current email OTP (using email_verification purpose)
    if not verify_otp(customer.email, current_email_otp, 'email_verification'):
        raise AuthenticationError("Invalid or expired OTP for current email address")
    
    # Verify new email OTP (using email_verification purpose)
    if not verify_otp(new_email, new_email_otp, 'email_verification'):
        raise AuthenticationError("Invalid or expired OTP for new email address")
    
    # Check if new email is already taken
    if Customer.objects.filter(email__iexact=new_email).exclude(id=customer_id).exists():
        return Response({
            'error': {'code': 'EMAIL_TAKEN', 'message': 'This email address is already registered'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update email address
    customer.email = new_email
    customer.save(update_fields=['email'])
    
    return Response({
        'message': 'Email address updated successfully',
        'email': new_email
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_events_featured(request):
    """
    Get featured events.
    GET /api/v1/public/events/featured/
    """
    # Featured events are those marked as featured=True, or if none, show upcoming events
    events = Event.objects.filter(
        Q(featured=True) | Q(status__in=['upcoming', 'ongoing'])
    ).exclude(status='cancelled').select_related('venue', 'category').prefetch_related('organizers', 'ticket_categories')
    
    # Order by featured first, then by date (upcoming first) and limit to 10
    events = events.order_by('-featured', 'date')[:10]
    
    serializer = PublicEventSerializer(events, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_events_categories(request):
    """
    Get event categories list.
    GET /api/v1/public/events/categories/
    """
    from events.models import EventCategory
    
    categories = EventCategory.objects.all()
    data = [{'id': cat.id, 'name': cat.name, 'icon': cat.icon} for cat in categories]
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_organizer_detail(request, organizer_id):
    """
    Get public organizer profile.
    GET /api/v1/public/organizers/:id/
    """
    from users.models import Organizer
    
    try:
        # For public view, only require active status (not verified=True)
        organizer = Organizer.objects.get(id=organizer_id, status='active')
    except Organizer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Organizer not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    events_count = Event.objects.filter(organizers=organizer, status__in=['upcoming', 'ongoing']).count()
    
    # Get logo URL if available
    logo_url = None
    if organizer.profile_image:
        logo_url = request.build_absolute_uri(organizer.profile_image.url)
    
    data = {
        'id': organizer.id,
        'name': organizer.name,
        'category': organizer.category,
        'location': organizer.location,
        'total_events': events_count,
        'rating': float(organizer.rating) if organizer.rating else None,
        'logo': logo_url,
    }
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_merchant_locations(request):
    """
    Get all active merchant locations (public endpoint).
    GET /api/v1/public/merchant-locations/
    """
    try:
        # Get all active locations, explicitly clearing default ordering to avoid NULL issues
        locations = MerchantLocation.objects.filter(
            is_active=True
        ).select_related('merchant').order_by()
        
        locations_data = []
        for location in locations:
            # Get merchant name safely
            merchant_name = 'Unknown Merchant'
            if location.merchant:
                merchant_name = getattr(location.merchant, 'business_name', None) or merchant_name
            elif location.merchant_name:
                merchant_name = location.merchant_name
            
            # Get phone number safely
            phone_number = location.phone_number
            if not phone_number and location.merchant:
                phone_number = getattr(location.merchant, 'phone', None)
            
            locations_data.append({
                'id': str(location.id),
                'merchant_name': merchant_name,
                'phone_number': phone_number or '',
                'address': location.address or '',
                'google_maps_link': location.google_maps_link or '',
            })
        
        # Sort in Python to avoid database NULL ordering issues
        locations_data.sort(key=lambda x: (x['merchant_name'], x['address']))
        
        return Response(locations_data, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        import sys
        exc_type, exc_value, exc_traceback = sys.exc_info()
        traceback.print_exception(exc_type, exc_value, exc_traceback)
        return Response(
            {'error': 'Failed to fetch merchant locations', 'detail': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def public_venues_list(request):
    """
    Get public venues list.
    GET /api/v1/public/venues/
    """
    from venues.models import Venue
    
    venues = Venue.objects.filter(status='active')
    
    city = request.query_params.get('city')
    if city:
        venues = venues.filter(city__icontains=city)
    
    data = [{
        'id': venue.id,
        'name': venue.name,
        'address': venue.address,
        'city': venue.city,
        'capacity': venue.capacity
    } for venue in venues]
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_ticket_detail(request, ticket_id):
    """
    Get ticket details.
    GET /api/v1/users/tickets/:id/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        # First check if ticket exists
        ticket_exists = Ticket.objects.filter(id=ticket_id).exists()
        if not ticket_exists:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if this ticket was transferred away by the current customer
        from tickets.models import TicketTransfer
        is_transferred_away = TicketTransfer.objects.filter(
            ticket_id=ticket_id,
            from_customer=customer,
            status='completed'
        ).exists()
        
        # Check if ticket was claimed by someone else (buyer is customer but customer is not)
        # This happens when a ticket is claimed via registration token
        ticket_check = Ticket.objects.select_related('event', 'customer', 'buyer').filter(id=ticket_id).first()
        is_claimed = False
        ticket_name = None
        if ticket_check:
            ticket_name = ticket_check.event.title if ticket_check.event else "Ticket"
            # If buyer is the current customer but customer is not, it means the ticket was claimed
            if ticket_check.buyer == customer and ticket_check.customer != customer:
                is_claimed = True
        
        if is_transferred_away or is_claimed:
            error_message = f'{ticket_name} was transferred' if ticket_name else 'This ticket has been transferred and is no longer available in your account'
            return Response({
                'error': {
                    'code': 'TICKET_TRANSFERRED', 
                    'message': error_message,
                    'ticket_name': ticket_name
                }
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Allow viewing ticket if user owns it (customer = customer) - this takes priority
        # OR if ticket is assigned to them (assigned_mobile matches)
        # OR if user bought ticket for someone else (assigned ticket)
        ticket = Ticket.objects.select_related('event', 'customer', 'buyer').filter(
            Q(id=ticket_id) & (
                Q(customer=customer) |  # User owns the ticket - always allow viewing
                Q(assigned_mobile=customer.mobile_number) |  # Ticket assigned to user
                (Q(buyer=customer) & Q(assigned_mobile__isnull=False))  # User bought for someone else
            )
        ).first()
        
        if not ticket:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
            }, status=status.HTTP_404_NOT_FOUND)
    except Exception:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get all tickets from the same booking (same event, same purchase date)
    # Show tickets where:
    # 1. Customer owns the ticket, OR
    # 2. Ticket is assigned to this customer, OR
    # 3. Customer bought ticket for someone else (assigned tickets)
    # BUT exclude tickets that were transferred away by this customer
    from tickets.models import TicketTransfer
    
    # Get IDs of tickets that were transferred away by this customer
    # Check for completed transfers where this customer was the sender
    # This is the primary way to exclude transferred tickets
    import logging
    logger = logging.getLogger(__name__)
    
    transferred_ticket_ids = list(TicketTransfer.objects.filter(
        from_customer=customer,
        status='completed'
    ).values_list('ticket_id', flat=True))
    
    logger.info(f"[TICKET_DETAIL] Customer {customer.id} - Found {len(transferred_ticket_ids)} transferred tickets: {transferred_ticket_ids}")
    logger.info(f"[TICKET_DETAIL] Viewing ticket {ticket_id}, is it in transferred list? {ticket_id in [str(tid) for tid in transferred_ticket_ids]}")
    
    purchase_date = ticket.purchase_date.date()
    # Build the base query
    all_booking_tickets_query = Ticket.objects.filter(
        event=ticket.event,
        purchase_date__date=purchase_date
    ).filter(
        Q(customer=customer) | 
        Q(assigned_mobile=customer.mobile_number) |
        (Q(buyer=customer) & Q(assigned_mobile__isnull=False))
    )
    
    logger.info(f"[TICKET_DETAIL] Found {all_booking_tickets_query.count()} tickets before exclusion")
    
    # Exclude transferred tickets if any exist
    if transferred_ticket_ids:
        all_booking_tickets_query = all_booking_tickets_query.exclude(id__in=transferred_ticket_ids)
        logger.info(f"[TICKET_DETAIL] After exclusion, found {all_booking_tickets_query.count()} tickets")
    
    # Also exclude tickets that match the fallback condition
    all_booking_tickets = all_booking_tickets_query.exclude(
        # Fallback: exclude if buyer is customer but customer is not customer and assigned_mobile is null
        # (this catches old transfers that might not have TicketTransfer records)
        Q(buyer=customer) & ~Q(customer=customer) & Q(assigned_mobile__isnull=True)
    ).select_related('customer', 'buyer').order_by('purchase_date')
    
    serializer = TicketSerializer(all_booking_tickets, many=True, context={'request': request})
    return Response({
        'ticket': TicketSerializer(ticket, context={'request': request}).data,
        'related_tickets': serializer.data,
        'total_tickets': all_booking_tickets.count()
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_ticket_claim(request, ticket_id):
    """
    Claim an assigned ticket (for already registered users).
    POST /api/v1/users/tickets/:id/claim/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        # Get the ticket
        ticket = Ticket.objects.select_related('event', 'customer', 'buyer').filter(id=ticket_id).first()
        
        if not ticket:
            return Response({
                'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if ticket is assigned to this user
        if not ticket.assigned_mobile or ticket.assigned_mobile != customer.mobile_number:
            return Response({
                'error': {'code': 'NOT_ASSIGNED', 'message': 'This ticket is not assigned to you'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if ticket is already claimed
        if ticket.customer and ticket.customer == customer:
            return Response({
                'error': {'code': 'ALREADY_CLAIMED', 'message': 'This ticket is already claimed'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Claim the ticket by setting customer to current user
        original_buyer = ticket.buyer if ticket.buyer else ticket.customer
        ticket.customer = customer
        # Keep buyer as original purchaser (for tracking who paid)
        if not ticket.buyer:
            ticket.buyer = original_buyer
        # Clear assigned fields since ticket is now owned by customer, not just assigned
        # IMPORTANT: Don't clear assigned_mobile immediately - it's needed for grouping
        # We'll clear it after a short delay or let it be cleared on next update
        ticket.assigned_name = None
        ticket.assigned_mobile = None
        ticket.assigned_email = None
        ticket.save(update_fields=['customer', 'buyer', 'assigned_name', 'assigned_mobile', 'assigned_email'])
        
        # Refresh from DB to ensure we have the latest data
        ticket.refresh_from_db()
        
        # Update any pending TicketTransfer records for this ticket
        from tickets.models import TicketTransfer
        TicketTransfer.objects.filter(
            ticket=ticket,
            to_customer__isnull=True,
            status='completed'
        ).update(to_customer=customer)
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Ticket {ticket.id} claimed by customer {customer.id}")
        
        # Return updated ticket data
        serializer = TicketSerializer(ticket, context={'request': request})
        return Response({
            'message': 'Ticket claimed successfully',
            'ticket': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error claiming ticket: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'CLAIM_ERROR', 'message': f'Failed to claim ticket: {str(e)}'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_ticket_transfer(request, ticket_id):
    """
    Transfer ticket to another user.
    POST /api/v1/users/tickets/:id/transfer/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        ticket = Ticket.objects.select_related('event', 'customer', 'buyer').get(id=ticket_id, customer_id=customer.id)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if ticket has already been transferred away
    from tickets.models import TicketTransfer
    existing_transfer = TicketTransfer.objects.filter(
        ticket=ticket,
        from_customer=customer,
        status='completed'
    ).exists()
    
    if existing_transfer:
        return Response({
            'error': {'code': 'ALREADY_TRANSFERRED', 'message': 'This ticket has already been transferred and cannot be transferred again'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if ticket.status != 'valid':
        return Response({
            'error': {'code': 'INVALID_TICKET', 'message': 'Ticket cannot be transferred'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not ticket.event.ticket_transfer_enabled:
        return Response({
            'error': {'code': 'TRANSFER_DISABLED', 'message': 'Ticket transfer is disabled for this event'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    recipient_mobile = request.data.get('recipient_mobile')
    recipient_name = request.data.get('recipient_name', '').strip()
    payment_method = request.data.get('payment_method', 'credit_card')  # Default to credit_card if not provided
    
    if not recipient_mobile:
        raise ValidationError("recipient_mobile is required")
    
    # Calculate transfer fee
    event = ticket.event
    transfer_fee = Decimal('0')
    if event.transfer_fee_value:
        if event.transfer_fee_type == 'percentage':
            # Percentage of ticket price
            transfer_fee = (ticket.price * event.transfer_fee_value) / Decimal('100')
        else:
            # Flat amount
            transfer_fee = event.transfer_fee_value
    
    # Process payment for transfer fee
    if transfer_fee > 0:
        transfer_payment = PaymentTransaction.objects.create(
            customer=customer,
            ticket=ticket,
            amount=transfer_fee,
            payment_method=payment_method,
            status='completed',  # For now, assume payment is successful
            transaction_id=str(uuid.uuid4())
        )
    
    # Try to find recipient customer
    recipient = None
    try:
        recipient = Customer.objects.get(mobile_number=recipient_mobile, status='active')
        recipient_name = recipient.name if not recipient_name else recipient_name
    except Customer.DoesNotExist:
        # Recipient doesn't exist yet - will be linked when they register
        pass
    
    # Store original owner info
    from_customer = ticket.customer
    original_buyer = ticket.buyer if ticket.buyer else ticket.customer
    
    # Update ticket ownership
    if recipient:
        # Recipient exists - transfer ownership immediately
        # Change the ticket owner to recipient
        ticket.customer = recipient
        # Keep buyer as original purchaser (for tracking who paid)
        if not ticket.buyer:
            ticket.buyer = original_buyer
        # Clear assigned fields since ticket is now owned by recipient, not just assigned
        # We could keep them for transfer history, but for clarity, clear them
        # The buyer field already tracks who originally purchased it
        ticket.assigned_name = None
        ticket.assigned_mobile = None
        ticket.assigned_email = None
    else:
        # Recipient doesn't exist yet - set assigned fields, keep ticket with current owner
        # Ticket will be linked when recipient registers (handled in registration/login)
        ticket.assigned_name = recipient_name
        ticket.assigned_mobile = recipient_mobile
        ticket.assigned_email = None
        # Keep buyer as original purchaser
        if not ticket.buyer:
            ticket.buyer = original_buyer
        # Keep customer as current owner until recipient registers
    
    ticket.save()
    
    # ALWAYS create TicketTransfer record to mark ticket as transferred away from original owner
    # This ensures the ticket is excluded from original owner's bookings
    from tickets.models import TicketTransfer
    transfer_record = TicketTransfer.objects.create(
        ticket=ticket,
        from_customer=from_customer,
        to_customer=recipient,  # Will be None if recipient doesn't exist yet
        status='completed'
    )
    
    return Response({
        'message': 'Ticket transferred successfully',
        'ticket': TicketSerializer(ticket, context={'request': request}).data,
        'transfer_fee': float(transfer_fee),
        'recipient_exists': recipient is not None
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_ticket_gift(request, ticket_id):
    """
    Gift ticket to another user.
    POST /api/v1/users/tickets/:id/gift/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id, customer_id=customer_id)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if ticket.status != 'valid':
        return Response({
            'error': {'code': 'INVALID_TICKET', 'message': 'Ticket cannot be gifted'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    recipient_mobile = request.data.get('recipient_mobile')
    recipient_name = request.data.get('recipient_name')
    
    if not recipient_mobile:
        raise ValidationError("recipient_mobile is required")
    
    try:
        recipient = Customer.objects.get(mobile_number=recipient_mobile, status='active')
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'RECIPIENT_NOT_FOUND', 'message': 'Recipient not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    ticket.customer = recipient
    ticket.save()
    
    return Response({
        'message': 'Ticket gifted successfully',
        'ticket': TicketSerializer(ticket).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_ticket_qr_code(request, ticket_id):
    """
    Generate QR code for ticket.
    GET /api/v1/users/tickets/:id/qr-code/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id, customer_id=customer_id)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Generate QR code data (QR code image generation will be added with library)
    qr_data = {
        'ticket_id': str(ticket.id),
        'ticket_number': ticket.ticket_number,
        'event_id': str(ticket.event.id),
        'customer_id': str(ticket.customer.id),
    }
    
    # TODO: Generate QR code image using qrcode library
    # For now, return data
    return Response({
        'message': 'QR code data (image generation pending)',
        'qr_data': qr_data,
        'ticket': TicketSerializer(ticket).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payment_process(request):
    """
    Process payment for booking.
    POST /api/v1/payments/process/
    """
    # Get customer from request (set by CustomerJWTAuthentication)
    customer = getattr(request, 'customer', None)
    if not customer:
        # Fallback: try to get from user.id (for compatibility)
        customer_id = request.user.id if hasattr(request.user, 'id') else None
        if customer_id:
            try:
                customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass
    
    if not customer:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    amount = request.data.get('amount')
    payment_method = request.data.get('payment_method')
    event_id = request.data.get('event_id')
    ticket_ids = request.data.get('ticket_ids', [])
    
    if not all([amount, payment_method]):
        raise ValidationError("amount and payment_method are required")
    
    # Convert amount to Decimal
    try:
        amount_decimal = Decimal(str(amount))
    except (ValueError, TypeError):
        raise ValidationError("Invalid amount format")
    
    # Get first ticket if ticket_ids provided (PaymentTransaction has ticket field, not event)
    ticket = None
    if ticket_ids and len(ticket_ids) > 0:
        try:
            ticket = Ticket.objects.get(id=ticket_ids[0], customer=customer)
        except Ticket.DoesNotExist:
            pass
    
    try:
        transaction = PaymentTransaction.objects.create(
            customer=customer,
            ticket=ticket,  # PaymentTransaction has ticket field, not event
            amount=amount_decimal,
            payment_method=payment_method,
            status='pending',
            transaction_id=str(uuid.uuid4())
        )
        
        return Response({
            'transaction_id': transaction.transaction_id,
            'status': transaction.status,
            'amount': float(transaction.amount)
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error processing payment: {str(e)}", exc_info=True)
        return Response({
            'error': {'code': 'PAYMENT_ERROR', 'message': f'Failed to process payment: {str(e)}'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payment_confirm(request):
    """
    Confirm payment transaction.
    POST /api/v1/payments/confirm/
    """
    transaction_id = request.data.get('transaction_id')
    if not transaction_id:
        raise ValidationError("transaction_id is required")
    
    try:
        transaction = PaymentTransaction.objects.get(transaction_id=transaction_id)
    except PaymentTransaction.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Transaction not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    transaction.status = 'completed'
    transaction.save()
    
    return Response({
        'message': 'Payment confirmed',
        'transaction': PaymentTransactionSerializer(transaction).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_status(request, transaction_id):
    """
    Get payment status.
    GET /api/v1/payments/:id/status/
    """
    try:
        transaction = PaymentTransaction.objects.get(transaction_id=transaction_id)
    except PaymentTransaction.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Transaction not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'transaction_id': transaction.transaction_id,
        'status': transaction.status,
        'amount': float(transaction.amount)
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_download(request, transaction_id):
    """
    Generate/download invoice PDF.
    GET /api/v1/invoices/:id/
    """
    try:
        transaction = PaymentTransaction.objects.select_related('customer', 'event').get(transaction_id=transaction_id)
    except PaymentTransaction.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Transaction not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Generate invoice data (PDF generation will be added with library)
    invoice_data = {
        'transaction_id': transaction.transaction_id,
        'customer': transaction.customer.name if transaction.customer else None,
        'event': transaction.event.title if transaction.event else None,
        'amount': float(transaction.amount),
        'currency': transaction.currency,
        'status': transaction.status,
        'timestamp': transaction.timestamp,
    }
    
    # TODO: Generate PDF using reportlab or weasyprint
    return Response({
        'message': 'Invoice data (PDF generation pending)',
        'invoice': invoice_data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_nfc_card_request(request):
    """
    Request a new NFC card.
    POST /api/v1/users/nfc-cards/request/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if customer already has an active card
    active_card = NFCCard.objects.filter(customer=customer, status='active').first()
    if active_card:
        return Response({
            'error': {'code': 'CARD_EXISTS', 'message': 'You already have an active NFC card'},
            'card': NFCCardSerializer(active_card).data
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Create card request (status will be pending until assigned by merchant/admin)
    card = NFCCard.objects.create(
        customer=customer,
        status='pending',
        serial_number=f"CARD-{uuid.uuid4().hex[:12].upper()}",
        issue_date=timezone.now().date(),
        expiry_date=timezone.now().date() + timedelta(days=365)  # 1 year from issue date
    )
    
    return Response({
        'message': 'NFC card request submitted',
        'card': NFCCardSerializer(card).data
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_nfc_card_reload(request, card_id):
    """
    Top-up NFC card balance.
    POST /api/v1/users/nfc-cards/:id/reload/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    amount = request.data.get('amount')
    if not amount or float(amount) <= 0:
        raise ValidationError("Valid amount is required")
    
    try:
        card = NFCCard.objects.get(id=card_id, customer_id=customer_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if card.status != 'active':
        return Response({
            'error': {'code': 'CARD_INACTIVE', 'message': 'Card is not active'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    card.balance += float(amount)
    card.save()
    
    return Response({
        'message': 'Card balance reloaded successfully',
        'card': NFCCardSerializer(card).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_nfc_card_transactions(request, card_id):
    """
    Get NFC card transaction history.
    GET /api/v1/users/nfc-cards/:id/transactions/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        card = NFCCard.objects.get(id=card_id, customer_id=customer_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    transactions = NFCCardTransaction.objects.filter(nfc_card=card).order_by('-timestamp')[:50]
    
    data = [{
        'id': t.id,
        'amount': float(t.amount),
        'transaction_type': t.transaction_type,
        'timestamp': t.timestamp,
        'description': t.description
    } for t in transactions]
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST', 'PUT'])
@permission_classes([IsAuthenticated])
def user_nfc_card_auto_reload_settings(request, card_id):
    """
    Setup or update auto-reload settings.
    POST/PUT /api/v1/users/nfc-cards/:id/auto-reload-settings/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        card = NFCCard.objects.get(id=card_id, customer_id=customer_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    threshold_amount = request.data.get('threshold_amount')
    reload_amount = request.data.get('reload_amount')
    enabled = request.data.get('enabled', False)
    
    auto_reload, created = NFCCardAutoReload.objects.get_or_create(nfc_card=card)
    
    if threshold_amount is not None:
        auto_reload.threshold_amount = float(threshold_amount)
    if reload_amount is not None:
        auto_reload.reload_amount = float(reload_amount)
    if enabled is not None:
        auto_reload.enabled = enabled
    
    auto_reload.save()
    
    return Response({
        'message': 'Auto-reload settings updated',
        'settings': {
            'threshold_amount': float(auto_reload.threshold_amount),
            'reload_amount': float(auto_reload.reload_amount),
            'enabled': auto_reload.enabled
        }
    }, status=status.HTTP_200_OK)


def find_customer_by_phone(phone_number: str):
    """
    Find customer by phone number, checking all possible formats.
    Returns Customer object or None.
    """
    if not phone_number:
        return None
    
    # Generate all possible phone number variations
    phone_variations = []
    
    # Remove all non-digit characters for normalization
    digits_only = re.sub(r'\D', '', phone_number)
    
    # Original format
    phone_variations.append(phone_number.strip())
    phone_variations.append(digits_only)
    
    # If it starts with 0, try without 0 and with country code
    if digits_only.startswith('0') and len(digits_only) == 11:
        # Remove leading 0: 01104484492 -> 1104484492
        phone_variations.append(digits_only[1:])
        # Add country code: 01104484492 -> 201104484492
        phone_variations.append('20' + digits_only[1:])
        # Add country code with +: 01104484492 -> +201104484492
        phone_variations.append('+20' + digits_only[1:])
    
    # If it starts with 20, try with and without +
    if digits_only.startswith('20') and len(digits_only) >= 12:
        phone_variations.append('+' + digits_only)
        phone_variations.append(digits_only)
    
    # If it starts with +20, try without +
    if phone_number.startswith('+20'):
        phone_variations.append(phone_number[1:])  # Remove +
        phone_variations.append(phone_number[3:])  # Remove +20
    
    # If it's 10 digits starting with 1, try with country code
    if digits_only.startswith('1') and len(digits_only) == 10:
        phone_variations.append('20' + digits_only)
        phone_variations.append('+20' + digits_only)
        phone_variations.append('0' + digits_only)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_variations = []
    for v in phone_variations:
        if v and v not in seen:
            seen.add(v)
            unique_variations.append(v)
    
    # Search in both phone and mobile_number fields
    try:
        customer = Customer.objects.filter(
            Q(phone__in=unique_variations) | Q(mobile_number__in=unique_variations)
        ).first()
        return customer
    except Exception:
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def find_customer_by_phone_api(request):
    """
    Find customer by phone number (handles all formats).
    GET /api/v1/admin/find-customer-by-phone/?phone=01104484492
    """
    phone_number = request.query_params.get('phone')
    if not phone_number:
        return Response({
            'error': {'code': 'VALIDATION_ERROR', 'message': 'phone parameter is required'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    customer = find_customer_by_phone(phone_number)
    
    if not customer:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Customer not found with this phone number'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    from apps.webapp.serializers import TicketSerializer
    return Response({
        'customer': {
            'id': str(customer.id),
            'name': customer.name,
            'phone': customer.phone,
            'mobile_number': customer.mobile_number,
            'email': customer.email,
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_nfc_card_assign_collector(request):
    """
    Assign a collector to collect NFC card on behalf of the owner.
    POST /api/v1/users/nfc-cards/assign-collector/
    Body: { "collector_phone": "01104484492" }
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        owner = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    collector_phone = request.data.get('collector_phone')
    if not collector_phone:
        return Response({
            'error': {'code': 'VALIDATION_ERROR', 'message': 'collector_phone is required'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Find collector by phone number (checking all formats)
    collector = find_customer_by_phone(collector_phone)
    
    if not collector:
        return Response({
            'error': {
                'code': 'COLLECTOR_NOT_FOUND',
                'message': 'The person you selected must have an account in our system to collect your card. Please ask them to create an account first.'
            }
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if collector is the same as owner
    if collector.id == owner.id:
        return Response({
            'error': {'code': 'INVALID_COLLECTOR', 'message': 'You cannot assign yourself as collector'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get the owner's active NFC card
    try:
        card = NFCCard.objects.get(customer=owner, status='active')
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'CARD_NOT_FOUND', 'message': 'You do not have an active NFC card'}
        }, status=status.HTTP_404_NOT_FOUND)
    except NFCCard.MultipleObjectsReturned:
        # If multiple active cards, get the most recent one
        card = NFCCard.objects.filter(customer=owner, status='active').order_by('-created_at').first()
    
    # Assign collector
    card.collector = collector
    card.save(update_fields=['collector'])
    
    return Response({
        'message': 'Collector assigned successfully',
        'collector': {
            'id': str(collector.id),
            'name': collector.name,
            'phone': collector.phone or collector.mobile_number,
            'profile_image': collector.profile_image.url if collector.profile_image else None
        }
    }, status=status.HTTP_200_OK)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_dependent_detail(request, dependent_id):
    """
    Update or delete dependent.
    PUT /api/v1/users/dependents/:id/
    DELETE /api/v1/users/dependents/:id/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        dependent = Dependent.objects.get(id=dependent_id, customer_id=customer_id)
    except Dependent.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Dependent not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'DELETE':
        dependent.delete()
        return Response({'message': 'Dependent deleted'}, status=status.HTTP_200_OK)
    
    # PUT - Update
    serializer = DependentSerializer(dependent, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    raise ValidationError(serializer.errors)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_analytics(request):
    """
    Get user analytics (booking history, attendance).
    GET /api/v1/users/analytics/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        customer = Customer.objects.get(id=customer_id)
    except Customer.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'User not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    tickets = Ticket.objects.filter(customer=customer)
    total_tickets = tickets.count()
    used_tickets = tickets.filter(status='used').count()
    valid_tickets = tickets.filter(status='valid').count()
    
    events_attended = tickets.filter(status='used').values('event').distinct().count()
    
    total_spent = PaymentTransaction.objects.filter(customer=customer, status='completed').aggregate(
        total=Sum('amount')
    )['total'] or 0
    
    data = {
        'total_bookings': total_tickets,
        'tickets_used': used_tickets,
        'tickets_valid': valid_tickets,
        'events_attended': events_attended,
        'total_spent': float(total_spent),
        'is_recurrent': customer.is_recurrent,
    }
    
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def checkin_verify(request):
    """
    Verify ticket/QR code for check-in.
    POST /api/v1/checkin/verify/
    """
    ticket_id = request.data.get('ticket_id')
    qr_data = request.data.get('qr_data')
    
    if not ticket_id and not qr_data:
        raise ValidationError("ticket_id or qr_data is required")
    
    try:
        if ticket_id:
            ticket = Ticket.objects.select_related('event', 'customer').get(id=ticket_id)
        else:
            # Parse QR data to get ticket_id
            # For now, assume qr_data contains ticket_id
            ticket = Ticket.objects.select_related('event', 'customer').get(id=qr_data)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'TICKET_NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if ticket.status != 'valid':
        return Response({
            'error': {'code': 'INVALID_TICKET', 'message': f'Ticket status is {ticket.status}'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Mark ticket as used
    ticket.status = 'used'
    ticket.check_in_time = timezone.now()
    ticket.save()
    
    return Response({
        'message': 'Check-in successful',
        'ticket': TicketSerializer(ticket).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def checkin_nfc(request):
    """
    NFC card check-in.
    POST /api/v1/checkin/nfc/
    """
    card_serial = request.data.get('card_serial')
    event_id = request.data.get('event_id')
    
    if not card_serial:
        raise ValidationError("card_serial is required")
    
    try:
        card = NFCCard.objects.select_related('customer').get(serial_number=card_serial, status='active')
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'CARD_NOT_FOUND', 'message': 'NFC card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Check if customer has valid ticket for event
    if event_id:
        ticket = Ticket.objects.filter(
            customer=card.customer,
            event_id=event_id,
            status='valid'
        ).first()
        
        if not ticket:
            return Response({
                'error': {'code': 'NO_TICKET', 'message': 'No valid ticket found for this event'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        ticket.status = 'used'
        ticket.check_in_time = timezone.now()
        ticket.save()
    
    card.last_used = timezone.now()
    card.usage_count += 1
    card.save()
    
    return Response({
        'message': 'NFC check-in successful',
        'card': NFCCardSerializer(card).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_payment_history(request):
    """
    Get user's payment history.
    GET /api/v1/users/payment-history/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    transactions = PaymentTransaction.objects.filter(customer_id=customer_id).order_by('-timestamp')
    
    serializer = PaymentTransactionSerializer(transactions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_refund_request(request, ticket_id):
    """
    Request a refund for a ticket.
    POST /api/v1/users/tickets/:id/refund-request/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        ticket = Ticket.objects.get(id=ticket_id, customer_id=customer_id)
    except Ticket.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Ticket not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if ticket.status != 'valid':
        return Response({
            'error': {'code': 'INVALID_TICKET', 'message': 'Only valid tickets can be refunded'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Mark ticket as refunded
    ticket.status = 'refunded'
    ticket.save()
    
    # Create refund transaction
    refund_transaction = PaymentTransaction.objects.create(
        customer=ticket.customer,
        event=ticket.event,
        ticket=ticket,
        amount=-ticket.price,  # Negative amount for refund
        payment_method='refund',
        status='completed',
        transaction_id=f"REFUND-{uuid.uuid4().hex[:12].upper()}"
    )
    
    return Response({
        'message': 'Refund request submitted',
        'refund_transaction': PaymentTransactionSerializer(refund_transaction).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_event_checkin_status(request, event_id):
    """
    Get user's check-in status for an event.
    GET /api/v1/users/events/:id/checkin-status/
    """
    customer_id = request.user.id if hasattr(request.user, 'id') else None
    if not customer_id:
        return Response({
            'error': {'code': 'UNAUTHORIZED', 'message': 'Authentication required'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    tickets = Ticket.objects.filter(customer_id=customer_id, event_id=event_id)
    
    data = {
        'event_id': str(event_id),
        'total_tickets': tickets.count(),
        'checked_in': tickets.filter(status='used').count(),
        'pending': tickets.filter(status='valid').count(),
        'tickets': TicketSerializer(tickets, many=True).data
    }
    
    return Response(data, status=status.HTTP_200_OK)
