"""
Views for Organizer Portal.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q, Count, Sum

from users.models import Organizer
from events.models import Event
from tickets.models import Ticket
from finances.models import Payout
from core.otp_service import create_and_send_otp, verify_otp
from core.exceptions import AuthenticationError, ValidationError
from core.permissions import IsOrganizer
from .serializers import (
    OrganizerLoginSerializer, OrganizerOTPSerializer,
    OrganizerProfileSerializer, OrganizerEventSerializer,
    OrganizerEventAnalyticsSerializer, OrganizerPayoutSerializer,
    EventEditRequestSerializer
)


@api_view(['POST'])
@permission_classes([AllowAny])
def organizer_login(request):
    """
    Organizer login endpoint.
    POST /api/organizer/login/
    """
    try:
        serializer = OrganizerLoginSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationError(serializer.errors)
        
        mobile = serializer.validated_data['mobile']
        password = serializer.validated_data['password']
        
        # Normalize mobile number: strip whitespace
        mobile = mobile.strip()
        
        # Handle multiple organizers with same contact_mobile
        organizers = Organizer.objects.filter(contact_mobile=mobile)
        
        # Log for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Login attempt for mobile='{mobile}' (length: {len(mobile)})")
        logger.info(f"Found {organizers.count()} organizer(s) with this mobile number")
        
        if not organizers.exists():
            logger.warning(f"No organizer found with mobile='{mobile}'")
            # Try to find similar mobile numbers for debugging
            similar = Organizer.objects.filter(contact_mobile__icontains=mobile[:5] if len(mobile) > 5 else mobile)[:5]
            if similar.exists():
                logger.warning(f"Similar mobile numbers found: {[o.contact_mobile for o in similar]}")
            raise AuthenticationError("Invalid mobile number or password")
        
        # If multiple organizers exist, prefer active ones
        active_organizers = organizers.filter(status='active')
        if active_organizers.exists():
            organizer = active_organizers.first()
            # If still multiple active organizers, log warning and use first
            if active_organizers.count() > 1:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Multiple active organizers found with contact_mobile={mobile}. Using first match (ID: {organizer.id})")
        else:
            # No active organizers found, use first match but check status
            organizer = organizers.first()
            if organizer.status != 'active':
                raise AuthenticationError("Your account is not active")
        
        # Log password check details
        logger.info(f"Checking password for organizer ID={organizer.id}, status={organizer.status}, has_password={bool(organizer.password)}")
        logger.info(f"Stored mobile: '{organizer.contact_mobile}' (length: {len(organizer.contact_mobile)})")
        logger.info(f"Mobile match: {organizer.contact_mobile == mobile}")
        
        password_check = organizer.check_password(password)
        logger.info(f"Password check result: {password_check}")
        
        if not password_check:
            logger.warning(f"Password check failed for organizer ID={organizer.id}")
            raise AuthenticationError("Invalid mobile number or password")
        
        # Create and send OTP
        otp, success = create_and_send_otp(mobile, 'login', app_name="TicketRunners Organizer")
        
        # If OTP was created, allow user to proceed even if SMS status is unclear
        # The OTP is stored in database and can be verified regardless of SMS API response
        if otp is None:
            return Response({
                'error': {
                    'code': 'OTP_SEND_FAILED',
                    'message': 'Failed to create OTP. Please try again.'
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        if not success:
            # OTP was created but SMS status indicates failure
            # Log warning but still allow user to proceed since OTP exists in database
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"OTP created for organizer {mobile} but SMS send status indicates failure")
        
        return Response({
            'message': 'OTP sent to your mobile number',
            'mobile': mobile
        }, status=status.HTTP_200_OK)
    except (AuthenticationError, ValidationError):
        # These are expected errors, let them propagate to the exception handler
        raise
    except Exception as e:
        # Unexpected errors - log and return generic error
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error in organizer_login: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred. Please try again.'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def organizer_verify_otp(request):
    """
    Verify OTP and return JWT tokens.
    POST /api/organizer/verify-otp/
    """
    serializer = OrganizerOTPSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    mobile = serializer.validated_data['mobile']
    otp_code = serializer.validated_data['otp_code']
    
    if not verify_otp(mobile, otp_code, 'login'):
        raise AuthenticationError("Invalid or expired OTP")
    
    # Handle multiple organizers with same contact_mobile
    organizers = Organizer.objects.filter(contact_mobile=mobile)
    
    if not organizers.exists():
        raise AuthenticationError("Organizer not found")
    
    # If multiple organizers exist, prefer active ones
    active_organizers = organizers.filter(status='active')
    if active_organizers.exists():
        organizer = active_organizers.first()
    else:
        organizer = organizers.first()
    
    # If still multiple active organizers, log warning and use first
    if active_organizers.count() > 1:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Multiple active organizers found with contact_mobile={mobile}. Using first match (ID: {organizer.id})")
    
    # Generate JWT tokens
    # We'll use a custom token that includes organizer info
    # For now, we'll create a simple token response
    # In production, you'd want to create a custom JWT token
    
    # Update last login
    organizer.last_login = timezone.now()
    organizer.save(update_fields=['last_login'])
    
    # Create refresh token with organizer_id
    refresh = RefreshToken()
    refresh['organizer_id'] = str(organizer.id)
    refresh['mobile'] = mobile
    
    # Access token is automatically created from refresh token
    # It will inherit the organizer_id claim
    access_token = refresh.access_token
    
    return Response({
        'access': str(access_token),
        'refresh': str(refresh),
        'organizer': OrganizerProfileSerializer(organizer).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsOrganizer])
def organizer_logout(request):
    """
    Organizer logout endpoint.
    POST /api/organizer/logout/
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
@permission_classes([IsOrganizer])
def organizer_me(request):
    """
    Get current organizer profile.
    GET /api/organizer/me/
    """
    try:
        if not hasattr(request, 'organizer') or request.organizer is None:
            return Response({
                'error': {
                    'code': 'AUTHENTICATION_ERROR',
                    'message': 'Organizer not authenticated'
                }
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        organizer = request.organizer
        serializer = OrganizerProfileSerializer(organizer, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error in organizer_me: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': f'An error occurred: {str(e)}'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_dashboard_stats(request):
    """
    Get organizer dashboard statistics.
    GET /api/organizer/dashboard/stats/
    """
    try:
        # Check if organizer is set on request
        if not hasattr(request, 'organizer') or request.organizer is None:
            return Response({
                'error': {
                    'code': 'AUTHENTICATION_ERROR',
                    'message': 'Organizer not authenticated'
                }
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        organizer = request.organizer
        
        events = Event.objects.filter(organizers=organizer)
        # Exclude black card tickets from all counts
        tickets_qs = Ticket.objects.filter(event__organizers=organizer, is_black_card=False)
        payouts = Payout.objects.filter(organizer=organizer)
        
        # Calculate available tickets: total tickets - sold tickets (excluding black card tickets)
        total_tickets = events.aggregate(total=Sum('total_tickets'))['total'] or 0
        tickets_sold = tickets_qs.filter(status__in=['valid', 'used']).count()
        available_tickets = total_tickets - tickets_sold
        
        stats = {
            'total_events': events.count(),
            'running_events': events.filter(status='ongoing').count(),
            'completed_events': events.filter(status='completed').count(),
            'available_tickets': available_tickets,
            'total_tickets_sold': tickets_sold,
            'total_attendees': tickets_qs.filter(status='used').count(),
            'total_revenues': float(tickets_qs.filter(status__in=['valid', 'used']).aggregate(
                total=Sum('price')
            )['total'] or 0),
            'net_revenues': float(payouts.filter(status='completed').aggregate(
                total=Sum('amount')
            )['total'] or 0),
            'total_processed_payouts': float(payouts.filter(status='completed').aggregate(
                total=Sum('amount')
            )['total'] or 0),
            'total_pending_payouts': float(payouts.filter(status='pending').aggregate(
                total=Sum('amount')
            )['total'] or 0),
        }
        
        return Response(stats, status=status.HTTP_200_OK)
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error in organizer_dashboard_stats: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': f'An error occurred: {str(e)}'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_events_list(request):
    """
    List organizer's events.
    GET /api/organizer/events/
    """
    try:
        # Check if organizer is set on request
        if not hasattr(request, 'organizer') or request.organizer is None:
            return Response({
                'error': {
                    'code': 'AUTHENTICATION_ERROR',
                    'message': 'Organizer not authenticated'
                }
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        organizer = request.organizer
        # Prefetch ticket categories for efficiency
        events = Event.objects.filter(organizers=organizer).select_related('venue', 'category').prefetch_related('ticket_categories', 'organizers')
        
        # Filtering
        status_filter = request.query_params.get('status')
        location_filter = request.query_params.get('location')
        search = request.query_params.get('search')
        
        if status_filter:
            events = events.filter(status=status_filter)
        if location_filter:
            events = events.filter(location__icontains=location_filter)
        if search:
            events = events.filter(Q(title__icontains=search) | Q(location__icontains=search))
        
        serializer = OrganizerEventSerializer(events, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error in organizer_events_list: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': f'An error occurred: {str(e)}'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_event_detail(request, event_id):
    """
    Get event details with analytics.
    GET /api/organizer/events/:id/
    """
    try:
        # Check if organizer is set on request
        if not hasattr(request, 'organizer') or request.organizer is None:
            return Response({
                'error': {
                    'code': 'AUTHENTICATION_ERROR',
                    'message': 'Organizer not authenticated'
                }
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        organizer = request.organizer
        # Prefetch ticket categories for efficiency
        # Try to convert event_id to UUID if it's a string, or use as-is if it's already a UUID
        try:
            import uuid
            if isinstance(event_id, str):
                # Try to parse as UUID
                try:
                    event_id = uuid.UUID(event_id)
                except ValueError:
                    # If it's not a valid UUID, try as integer (for backward compatibility)
                    try:
                        event_id = int(event_id)
                    except ValueError:
                        pass
            event = Event.objects.select_related('venue', 'category').prefetch_related('organizers', 'ticket_categories').get(id=event_id, organizers=organizer)
        except (ValueError, TypeError) as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Invalid event_id format: {event_id}, error: {str(e)}")
            return Response({
                'error': {'code': 'INVALID_ID', 'message': 'Invalid event ID format'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = OrganizerEventAnalyticsSerializer(event, context={'request': request})
        
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Event {event_id} ticket categories count: {event.ticket_categories.count()}")
        logger.info(f"Serializer ticket_categories: {serializer.data.get('ticket_categories', [])}")
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error in organizer_event_detail: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': f'An error occurred: {str(e)}'
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsOrganizer])
def organizer_event_edit_request(request, event_id):
    """
    Submit event edit request.
    POST /api/organizer/events/:id/edit-request/
    """
    organizer = request.organizer
    try:
        event = Event.objects.get(id=event_id, organizer=organizer)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = EventEditRequestSerializer(data={
        'event': event.id,
        'organizer': organizer.id,
        'requested_changes': request.data.get('requested_changes', ''),
        'file_attachments': request.data.get('file_attachments', ''),
    })
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    raise ValidationError(serializer.errors)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_payouts_list(request):
    """
    List organizer's payouts.
    GET /api/organizer/payouts/
    """
    organizer = request.organizer
    payouts = Payout.objects.filter(organizer=organizer)
    
    # Filtering
    status_filter = request.query_params.get('status')
    search = request.query_params.get('search')
    
    if status_filter:
        payouts = payouts.filter(status=status_filter)
    if search:
        payouts = payouts.filter(
            Q(reference__icontains=search)
        )
    
    serializer = OrganizerPayoutSerializer(payouts, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_payout_detail(request, payout_id):
    """
    Get payout details.
    GET /api/organizer/payouts/:id/
    """
    organizer = request.organizer
    try:
        payout = Payout.objects.get(id=payout_id, organizer=organizer)
    except Payout.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Payout not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    serializer = OrganizerPayoutSerializer(payout)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_profile(request):
    """
    Get organizer profile (read-only for organizers).
    Organizers must use edit requests to change their profile.
    GET /api/organizer/profile/
    """
    organizer = request.organizer
    serializer = OrganizerProfileSerializer(organizer, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsOrganizer])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def organizer_profile_edit_request(request):
    """
    Create a profile edit request (requires admin approval).
    POST /api/organizer/profile/edit-request/
    """
    from users.models import OrganizerEditRequest
    from apps.organizer_portal.serializers import OrganizerEditRequestSerializer
    
    organizer = request.organizer
    
    # Prepare requested data from form data
    requested_data = {}
    profile_image_file = None
    
    # Handle both FormData and JSON
    if hasattr(request.data, 'get'):
        # Extract text fields
        for field in ['name', 'legal_business_name', 'trade_name', 'tax_id', 
                     'commercial_registration', 'about', 'contact_mobile', 'phone', 'email']:
            if field in request.data and request.data[field]:
                requested_data[field] = request.data[field]
        
        # Handle profile image file
        if 'profile_image' in request.FILES:
            profile_image_file = request.FILES['profile_image']
        elif 'profile_image' in request.data and request.data['profile_image'] == '':
            # Image removal requested
            requested_data['profile_image'] = None
    
    # Create edit request
    edit_request = OrganizerEditRequest.objects.create(
        organizer=organizer,
        requested_data=requested_data,
        profile_image=profile_image_file
    )
    
    serializer = OrganizerEditRequestSerializer(edit_request, context={'request': request})
    return Response({
        'message': 'Edit request submitted successfully. It will be reviewed by an administrator.',
        'request': serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_edit_requests_list(request):
    """
    Get list of organizer's edit requests.
    GET /api/organizer/profile/edit-requests/
    """
    from users.models import OrganizerEditRequest
    from apps.organizer_portal.serializers import OrganizerEditRequestSerializer
    
    organizer = request.organizer
    requests = OrganizerEditRequest.objects.filter(organizer=organizer).order_by('-created_at')
    
    serializer = OrganizerEditRequestSerializer(requests, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsOrganizer])
def organizer_change_password(request):
    """
    Change organizer password.
    POST /api/organizer/profile/change-password/
    """
    organizer = request.organizer
    
    current_password = request.data.get('current_password')
    otp_code = request.data.get('otp_code')
    new_password = request.data.get('new_password')
    
    if not all([current_password, otp_code, new_password]):
        raise ValidationError("All fields are required")
    
    # Verify current password
    if not organizer.check_password(current_password):
        raise AuthenticationError("Current password is incorrect")
    
    # Verify OTP
    if not verify_otp(organizer.contact_mobile, otp_code, 'forgot_password'):
        raise AuthenticationError("Invalid or expired OTP")
    
    # Set new password
    organizer.set_password(new_password)
    organizer.save()
    
    return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def organizer_forgot_password(request):
    """
    Request password reset OTP.
    POST /api/organizer/forgot-password/
    """
    mobile = request.data.get('mobile')
    if not mobile:
        raise ValidationError("mobile is required")
    
    # Handle multiple organizers with same contact_mobile
    organizers = Organizer.objects.filter(contact_mobile=mobile)
    
    if not organizers.exists():
        # Don't reveal if organizer exists for security
        return Response({
            'message': 'If the mobile number exists, an OTP has been sent'
        }, status=status.HTTP_200_OK)
    
    # Use first active organizer if available, otherwise first match
    organizer = organizers.filter(status='active').first() or organizers.first()
    
    otp, success = create_and_send_otp(mobile, 'forgot_password', app_name="TicketRunners Organizer")
    
    if not success:
        return Response({
            'error': {'code': 'OTP_SEND_FAILED', 'message': 'Failed to send OTP'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'message': 'OTP sent to your mobile number',
        'mobile': mobile
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def organizer_reset_password(request):
    """
    Reset password with OTP.
    POST /api/organizer/reset-password/
    """
    mobile = request.data.get('mobile')
    otp_code = request.data.get('otp_code')
    new_password = request.data.get('new_password')
    
    if not all([mobile, otp_code, new_password]):
        raise ValidationError("mobile, otp_code, and new_password are required")
    
    if not verify_otp(mobile, otp_code, 'forgot_password'):
        raise AuthenticationError("Invalid or expired OTP")
    
    # Handle multiple organizers with same contact_mobile
    organizers = Organizer.objects.filter(contact_mobile=mobile)
    
    if not organizers.exists():
        raise AuthenticationError("Organizer not found")
    
    # If multiple organizers exist, prefer active ones
    active_organizers = organizers.filter(status='active')
    if active_organizers.exists():
        organizer = active_organizers.first()
    else:
        organizer = organizers.first()
    
    # If still multiple active organizers, log warning and use first
    if active_organizers.count() > 1:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Multiple active organizers found with contact_mobile={mobile}. Using first match (ID: {organizer.id})")
    
    organizer.set_password(new_password)
    organizer.save()
    
    return Response({'message': 'Password reset successfully'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsOrganizer])
def organizer_payout_invoice(request, payout_id):
    """
    Download payout invoice PDF.
    GET /api/organizer/payouts/:id/invoice/
    """
    organizer = request.organizer
    try:
        payout = Payout.objects.get(id=payout_id, organizer=organizer)
    except Payout.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Payout not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Generate invoice data (PDF generation will be added with library)
    invoice_data = {
        'reference': payout.reference,
        'amount': float(payout.amount),
        'created_at': payout.created_at,
        'status': payout.status,
        'method': payout.method,
        'organizer': organizer.name,
    }
    
    # TODO: Generate PDF using reportlab or weasyprint
    # For now, return JSON data
    return Response({
        'message': 'Invoice data (PDF generation pending)',
        'invoice': invoice_data
    }, status=status.HTTP_200_OK)
