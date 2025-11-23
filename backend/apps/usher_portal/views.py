"""
Views for Usher Portal.
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q
from django.core.paginator import Paginator
import uuid

from users.models import Usher
from events.models import Event
from tickets.models import Ticket
from nfc_cards.models import NFCCard
from customers.models import Customer, Dependent
from system.models import CheckinLog
from apps.usher_portal.models import PartTimeLeave, ScanReport
from apps.usher_portal.authentication import UsherJWTAuthentication
from core.exceptions import AuthenticationError, ValidationError
from .serializers import (
    UsherLoginSerializer, UsherProfileSerializer, EventSerializer,
    AttendeeSerializer, ScanCardSerializer, ScanResultSerializer,
    ScanLogSerializer, ScanLogSearchSerializer, PartTimeLeaveSerializer,
    ScanReportSerializer
)


class IsUsherPortal(permissions.BasePermission):
    """
    Permission class that allows access only to authenticated ushers.
    Checks if request has usher attribute set by custom authentication.
    """
    
    def has_permission(self, request, view):
        return (
            hasattr(request, 'usher') and
            request.usher is not None
        )


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def usher_login(request):
    """
    Usher login endpoint.
    POST /api/usher/login/
    Body: { "username": "usher1", "password": "password", "event_id": "uuid" }
    """
    serializer = UsherLoginSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    username = serializer.validated_data['username']
    password = serializer.validated_data['password']
    event_id = serializer.validated_data['event_id']
    
    # Authenticate usher via AdminUser
    from django.contrib.auth import authenticate
    from authentication.models import AdminUser
    
    user = authenticate(username=username, password=password)
    if not user:
        raise AuthenticationError("Invalid username or password")
    
    if not user.is_active:
        raise AuthenticationError("User account is disabled")
    
    if user.role != 'USHER':
        raise AuthenticationError("User is not an usher")
    
    # Get usher profile
    try:
        usher = Usher.objects.get(user=user)
    except Usher.DoesNotExist:
        raise AuthenticationError("Usher profile not found")
    
    if usher.status != 'active':
        raise AuthenticationError("Usher account is not active")
    
    # Validate event assignment - check event exists in admin system
    try:
        event = Event.objects.select_related('organizer', 'venue').get(id=event_id)
    except Event.DoesNotExist:
        raise ValidationError(
            detail=f'Event with ID {event_id} not found in the system',
            code='EVENT_NOT_FOUND'
        )
    
    # Check if event is active/valid for scanning
    if event.status not in ['scheduled', 'ongoing', 'upcoming']:
        raise ValidationError(
            detail=f'Event "{event.title}" is not active for scanning. Current status: {event.status}',
            code='EVENT_NOT_ACTIVE'
        )
    
    # Verify usher is assigned to this event
    if event not in usher.events.all():
        raise AuthenticationError(
            detail=f'Usher "{usher.name}" is not assigned to event "{event.title}"',
            code='EVENT_NOT_ASSIGNED'
        )
    
    # Update last active
    usher.last_active = timezone.now()
    usher.save(update_fields=['last_active'])
    
    # Generate JWT tokens
    refresh = RefreshToken()
    refresh['usher_id'] = str(usher.id)
    refresh['event_id'] = str(event_id)
    refresh['username'] = username
    
    access_token = refresh.access_token
    
    return Response({
        'access': str(access_token),
        'refresh': str(refresh),
        'usher': UsherProfileSerializer(usher).data,
        'event': EventSerializer(event).data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_logout(request):
    """
    Usher logout endpoint.
    POST /api/usher/logout/
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
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_me(request):
    """
    Get current usher profile.
    GET /api/usher/me/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    serializer = UsherProfileSerializer(usher)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_events_list(request):
    """
    List assigned events for usher.
    GET /api/usher/events/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    events = usher.events.all()
    serializer = EventSerializer(events, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_event_detail(request, event_id):
    """
    Get event details.
    GET /api/usher/events/:id/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    try:
        event = Event.objects.get(id=int(event_id))
    except (Event.DoesNotExist, ValueError):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if event not in usher.events.all():
        return Response({
            'error': {'code': 'FORBIDDEN', 'message': 'Usher is not assigned to this event'}
        }, status=status.HTTP_403_FORBIDDEN)
    
    serializer = EventSerializer(event)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_event_validate_assignment(request, event_id):
    """
    Validate event assignment.
    POST /api/usher/events/:id/validate-assignment/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    try:
        event = Event.objects.get(id=int(event_id))
    except (Event.DoesNotExist, ValueError):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    is_assigned = event in usher.events.all()
    return Response({
        'is_assigned': is_assigned,
        'event_id': event_id,
        'usher_id': str(usher.id)
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_verify_card(request):
    """
    Verify NFC card ID.
    POST /api/usher/scan/verify-card/
    Body: { "card_id": "card123" }
    """
    serializer = ScanCardSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    card_id = serializer.validated_data['card_id']
    
    try:
        card = NFCCard.objects.get(serial_number=card_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'},
            'valid': False
        }, status=status.HTTP_200_OK)
    
    return Response({
        'valid': True,
        'card_id': card.serial_number,
        'status': card.status,
        'customer_id': str(card.customer.id) if card.customer else None
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_attendee_by_card(request, card_id):
    """
    Get attendee by card ID.
    GET /api/usher/scan/attendee/:card_id/
    """
    # Trim whitespace from card_id
    card_id = card_id.strip()
    
    event_id = request.query_params.get('event_id')
    
    try:
        card = NFCCard.objects.get(serial_number=card_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    if not card.customer:
        return Response({
            'error': {'code': 'NO_CUSTOMER', 'message': 'Card is not assigned to a customer'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    customer = card.customer
    
    # Get ticket for event if event_id provided
    ticket = None
    ticket_status = 'invalid'
    ticket_tier = 'standard'
    scan_status = 'not_scanned'
    event_obj = None  # Store event object for later use
    
    if event_id:
        try:
            event_id_int = int(event_id)
            event_obj = Event.objects.get(id=event_id_int)
            
            # Look for tickets for this customer and event
            # Check both customer (current owner) and buyer (original purchaser) relationships
            tickets = Ticket.objects.filter(
                event=event_obj
            ).filter(
                Q(customer=customer) | Q(buyer=customer)
            ).exclude(
                status__in=['refunded', 'banned']  # Exclude invalid statuses
            ).order_by('-purchase_date')  # Get most recent ticket first
            
            if tickets.exists():
                ticket = tickets.first()
                
                # Determine ticket status
                # Check if ticket was already scanned by looking at CheckinLog
                last_scan_log = None
                try:
                    existing_logs = CheckinLog.objects.filter(
                        ticket=ticket,
                        event=event_obj,
                        scan_result='success'
                    ).order_by('-timestamp')
                    
                    if existing_logs.exists():
                        last_scan_log = existing_logs.first()
                        existing_logs_bool = True
                    else:
                        existing_logs_bool = False
                except Exception as e:
                    # If CheckinLog check fails, fall back to ticket status
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Error checking CheckinLog: {str(e)}")
                    existing_logs_bool = False
                
                if ticket.status == 'valid' and not existing_logs_bool:
                    ticket_status = 'valid'
                    scan_status = 'not_scanned'
                elif ticket.status == 'used' or existing_logs_bool:
                    ticket_status = 'valid'  # Still valid, just already scanned
                    scan_status = 'already_scanned'
                else:
                    ticket_status = 'invalid'
                    scan_status = 'not_scanned'
                
                ticket_tier = ticket.category.lower() if ticket.category else 'standard'
            else:
                # No ticket found for this event
                ticket_status = 'invalid'
                scan_status = 'not_scanned'
                
        except (Event.DoesNotExist, ValueError, TypeError):
            # Event not found or invalid event_id
            ticket_status = 'invalid'
            scan_status = 'not_scanned'
    
    # Get all events this customer has tickets for (for reference)
    customer_events = []
    try:
        # Get unique events this customer has tickets for
        all_tickets = Ticket.objects.filter(
            Q(customer=customer) | Q(buyer=customer)
        ).exclude(
            status__in=['refunded', 'banned']
        ).select_related('event').order_by('-purchase_date')
        
        # Get unique events (avoid duplicates)
        seen_events = set()
        for ticket in all_tickets:
            if ticket.event and ticket.event.id not in seen_events:
                seen_events.add(ticket.event.id)
                customer_events.append({
                    'event_id': str(ticket.event.id),  # Convert to string for JSON serialization
                    'event_title': ticket.event.title if ticket.event.title else '',
                    'ticket_status': ticket.status if ticket.status else 'unknown',
                    'ticket_tier': ticket.category.lower() if ticket.category else 'standard'
                })
                if len(customer_events) >= 10:  # Limit to 10 most recent
                    break
    except Exception as e:
        # Log error but don't fail
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error getting customer events: {str(e)}")
        pass
    
    # Check if customer is on part-time leave
    part_time_leave = None
    if event_obj and hasattr(request, 'usher') and request.usher:
        try:
            # Check for active leave (no return_time) for this customer
            active_leaves = PartTimeLeave.objects.filter(
                usher=request.usher,
                event=event_obj,
                return_time__isnull=True
            ).order_by('-leave_time')
            
            # Try to match by customer name in reason
            customer_name = customer.name if customer else None
            if customer_name:
                for leave in active_leaves:
                    if leave.reason and customer_name in leave.reason:
                        part_time_leave = {
                            'id': str(leave.id),
                            'leave_time': leave.leave_time.isoformat() if leave.leave_time else None,
                            'reason': leave.reason
                        }
                        break
        except (AttributeError, Exception) as e:
            # Silently fail - part-time leave check is optional
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error checking part-time leave: {str(e)}")
            pass
    
    # Get dependents/children
    children = []
    try:
        dependents = Dependent.objects.filter(customer=customer)
        for dep in dependents:
            children.append({
                'name': dep.name if dep.name else '',
                'age': dep.age if dep.age else None,
                'relationship': dep.relationship if dep.relationship else ''
            })
    except Exception:
        pass
    
    # Get photo URL
    photo_url = None
    try:
        if customer.profile_image:
            request_obj = request if hasattr(request, 'build_absolute_uri') else None
            if request_obj:
                photo_url = request_obj.build_absolute_uri(customer.profile_image.url)
            else:
                photo_url = customer.profile_image.url
    except Exception:
        pass
    
    # Get last scan log information if ticket was scanned
    last_scan_info = None
    if event_obj and ticket:
        try:
            last_scan = CheckinLog.objects.filter(
                ticket=ticket,
                event=event_obj,
                scan_result='success'
            ).select_related('operator').order_by('-timestamp').first()
            
            if last_scan:
                operator_name = 'Unknown'
                if last_scan.operator:
                    # Try to get full name (first_name + last_name)
                    if last_scan.operator.first_name or last_scan.operator.last_name:
                        operator_name = f"{last_scan.operator.first_name or ''} {last_scan.operator.last_name or ''}".strip()
                    # Fallback to username if no name
                    if not operator_name or operator_name == 'Unknown':
                        operator_name = last_scan.operator.username or 'Unknown'
                elif last_scan.operator_role:
                    operator_name = last_scan.operator_role
                
                last_scan_info = {
                    'scan_id': str(last_scan.id),
                    'scanned_by': last_scan.operator.username if last_scan.operator else (last_scan.operator_role or 'Unknown'),
                    'scan_timestamp': last_scan.timestamp.isoformat() if last_scan.timestamp else None,
                    'operator_name': operator_name,
                }
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error getting last scan info: {str(e)}")
            pass
    
    # Prepare attendee data
    try:
        attendee_data = {
            'customer_id': str(customer.id),  # Convert UUID to string
            'name': customer.name if customer.name else '',
            'photo': photo_url or None,
            'card_id': card_id,
            'ticket_id': str(ticket.id) if ticket and hasattr(ticket, 'id') else None,
            'ticket_status': ticket_status,
            'ticket_tier': ticket_tier,
            'scan_status': scan_status,
            'emergency_contact': customer.emergency_contact_mobile if hasattr(customer, 'emergency_contact_mobile') and customer.emergency_contact_mobile else None,
            'emergency_contact_name': customer.emergency_contact_name if hasattr(customer, 'emergency_contact_name') and customer.emergency_contact_name else None,
            'blood_type': customer.blood_type if hasattr(customer, 'blood_type') and customer.blood_type else None,
            'labels': [],
            'children': children,
            'customer_events': customer_events,  # All events customer has tickets for
            'part_time_leave': part_time_leave,  # Part-time leave status
            'last_scan': last_scan_info  # Last scan information
        }
        
        # Validate and serialize
        serializer = AttendeeSerializer(data=attendee_data)
        if serializer.is_valid():
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        else:
            # If serializer validation fails, return data anyway but log the error
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"AttendeeSerializer validation failed: {serializer.errors}")
            # Return the data directly, ensuring all values are JSON serializable
            response_data = {
                'customer_id': str(customer.id),
                'name': attendee_data['name'],
                'photo': attendee_data['photo'],
                'card_id': attendee_data['card_id'],
                'ticket_id': str(ticket.id) if ticket and hasattr(ticket, 'id') else None,
                'ticket_status': attendee_data['ticket_status'],
                'ticket_tier': attendee_data['ticket_tier'],
                'scan_status': attendee_data['scan_status'],
                'emergency_contact': attendee_data.get('emergency_contact'),
                'emergency_contact_name': attendee_data.get('emergency_contact_name'),
                'blood_type': attendee_data.get('blood_type'),
                'labels': attendee_data['labels'],
                'children': attendee_data['children'],
                'customer_events': attendee_data.get('customer_events', []),
                'part_time_leave': attendee_data.get('part_time_leave'),
                'last_scan': attendee_data.get('last_scan')
            }
            return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        # Log the full error for debugging
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error in usher_scan_attendee_by_card: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': {'code': 'INTERNAL_ERROR', 'message': f'An error occurred: {str(e)}'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_result(request):
    """
    Process scan result.
    POST /api/usher/scan/result/
    Body: { "card_id": "card123", "event_id": "uuid", "result": "valid", "notes": "" }
    """
    serializer = ScanResultSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    card_id = serializer.validated_data['card_id']
    event_id = serializer.validated_data['event_id']
    result = serializer.validated_data['result']
    notes = serializer.validated_data.get('notes', '')
    
    try:
        card = NFCCard.objects.get(serial_number=card_id)
    except NFCCard.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Card not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    try:
        # Handle both integer and UUID event IDs
        try:
            event_id_int = int(event_id)
            event = Event.objects.get(id=event_id_int)
        except (ValueError, TypeError):
            # Try as UUID
            event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Initialize logger early
    import logging
    logger = logging.getLogger(__name__)
    
    if not card.customer:
        # Still create a log entry even if no customer, but mark it appropriately
        customer = None
        logger.warning(f"[usher_scan_result] Card {card_id} has no customer assigned")
    else:
        customer = card.customer
    
    # Get ticket - check both customer and buyer relationships
    ticket = None
    if customer:
        ticket = Ticket.objects.filter(
            event=event
        ).filter(
            Q(customer=customer) | Q(buyer=customer)
        ).exclude(
            status__in=['refunded', 'banned']
        ).order_by('-purchase_date').first()
    
    # Update ticket status if valid scan
    if result == 'valid' and ticket:
        ticket.status = 'used'
        ticket.save(update_fields=['status'])
    
    # ALWAYS create check-in log - this ensures EVERY scan action is logged
    scan_result_map = {
        'valid': 'success',
        'invalid': 'invalid',
        'already_scanned': 'duplicate',
        'not_found': 'failed'
    }
    
    # Get operator (AdminUser) from usher if available
    operator = None
    if hasattr(usher, 'user') and usher.user:
        operator = usher.user
    
    # ALWAYS create log entry - retry if it fails
    log_entry = None
    log_creation_error = None
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Ensure we have required fields
            if not event:
                raise ValueError("Event is required to create log entry")
            if not card:
                raise ValueError("Card is required to create log entry")
            
            log_entry = CheckinLog.objects.create(
                customer=customer,  # Can be None
                event=event,
                nfc_card=card,
                scan_result=scan_result_map.get(result, 'failed'),
                scan_type='nfc',
                operator=operator,  # Can be None
                operator_role='usher',
                timestamp=timezone.now(),
                notes=notes or ''
            )
            
            # Force database commit to ensure log is immediately available
            from django.db import transaction
            transaction.on_commit(lambda: None)
            
            logger.info(f"[usher_scan_result] ✅ Created check-in log ID={log_entry.id} for event_id={event.id} (type: {type(event.id).__name__}), event_id_int={int(event.id) if hasattr(event.id, '__int__') else event.id}, card_id={card.serial_number if card else None}, result={result}, attempt={attempt + 1}")
            
            # Verify the log was created and can be queried
            verify_log = CheckinLog.objects.filter(id=log_entry.id).first()
            if verify_log:
                logger.info(f"[usher_scan_result] ✅ Verified log exists: id={verify_log.id}, event_id={verify_log.event_id}, event__id={verify_log.event.id if verify_log.event else None}")
            else:
                logger.error(f"[usher_scan_result] ❌ CRITICAL: Log {log_entry.id} was created but cannot be queried immediately!")
            
            break  # Success, exit retry loop
        except Exception as e:
            log_creation_error = str(e)
            logger.error(f"[usher_scan_result] ❌ Error creating check-in log (attempt {attempt + 1}/{max_retries}): {str(e)}", exc_info=True)
            if attempt == max_retries - 1:
                # Last attempt failed, log critical error
                logger.critical(f"[usher_scan_result] ❌ CRITICAL: Failed to create check-in log after {max_retries} attempts for card_id={card.serial_number}, event_id={event.id if event else None}, result={result}, error: {log_creation_error}")
            else:
                # Wait a bit before retrying
                import time
                time.sleep(0.1 * (attempt + 1))
    
    # If log creation failed, include error in response
    response_data = {
        'message': 'Scan result processed successfully',
        'result': result,
        'ticket_id': str(ticket.id) if ticket else None,
        'log_id': str(log_entry.id) if log_entry else None,
        'log_created': log_entry is not None
    }
    
    if not log_entry and log_creation_error:
        response_data['log_error'] = log_creation_error
        logger.warning(f"[usher_scan_result] Returning response without log: {response_data}")
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_log(request):
    """
    Log scan activity.
    POST /api/usher/scan/log/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # This endpoint can be used for additional logging if needed
    # The scan result endpoint already creates logs
    return Response({'message': 'Scan logged'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_logs_list(request):
    """
    List scan logs (paginated, 10 per page).
    GET /api/usher/scan/logs/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    event_id = request.query_params.get('event_id')
    
    import logging
    logger = logging.getLogger(__name__)
    
    # Show all logs for the event, not just current usher
    logs = CheckinLog.objects.select_related('operator', 'event', 'customer', 'nfc_card').order_by('-timestamp')
    
    # Debug: Log total logs before filtering
    total_logs_before_filter = logs.count()
    logger.info(f"[usher_scan_logs_list] Total logs before filter: {total_logs_before_filter}, event_id param: {event_id}")
    
    if event_id:
        # Handle both integer and UUID event IDs
        # Use Q object to check both event_id (database column) and event__id (related object)
        from django.db.models import Q
        try:
            # Try as integer first
            try:
                event_id_int = int(event_id)
                # Filter by both event_id (FK column) and event__id (related object id) to handle all cases
                logs = logs.filter(Q(event_id=event_id_int) | Q(event__id=event_id_int))
                logger.info(f"[usher_scan_logs_list] Filtering by event_id as int: {event_id_int} (using both event_id and event__id)")
            except (ValueError, TypeError):
                # Try as UUID string or other format
                logs = logs.filter(Q(event_id=event_id) | Q(event__id=event_id))
                logger.info(f"[usher_scan_logs_list] Filtering by event_id as UUID/string: {event_id} (using both event_id and event__id)")
        except Exception as e:
            logger.warning(f"Error filtering logs by event_id {event_id}: {str(e)}", exc_info=True)
            # Continue without filter if there's an error
    
    # Debug: Log total logs after filtering
    total_logs_after_filter = logs.count()
    logger.info(f"[usher_scan_logs_list] Total logs after filter: {total_logs_after_filter}")
    
    # If no logs found, try to find what event_ids exist in the logs
    if total_logs_after_filter == 0 and event_id:
        from django.db.models import Count
        existing_event_ids = CheckinLog.objects.values('event_id').annotate(count=Count('id')).order_by('-count')[:5]
        logger.warning(f"[usher_scan_logs_list] No logs found for event_id={event_id}. Existing event_ids in DB: {list(existing_event_ids)}")
    
    # Pagination
    page = request.query_params.get('page', 1)
    try:
        page = int(page)
    except (ValueError, TypeError):
        page = 1
    
    paginator = Paginator(logs, 10)
    page_obj = paginator.get_page(page)
    
    serializer = ScanLogSerializer(page_obj, many=True)
    
    # Debug logging
    total_count = paginator.count
    logger.info(f"[usher_scan_logs_list] Returning {len(serializer.data)} logs for event_id={event_id}, page={page}, total={total_count}")
    
    # If no logs found with event_id filter, check if any logs exist at all
    if total_count == 0 and event_id:
        all_logs_count = CheckinLog.objects.count()
        logger.warning(f"[usher_scan_logs_list] No logs found for event_id={event_id}, but total logs in DB: {all_logs_count}")
        # If logs exist but not for this event, try without filter as fallback (temporary for debugging)
        if all_logs_count > 0:
            logger.info(f"[usher_scan_logs_list] Found {all_logs_count} total logs. Checking if event_id format mismatch...")
            # Try to find logs with different event_id formats
            try:
                event_id_int = int(event_id)
                alt_logs = CheckinLog.objects.filter(event_id=event_id_int).count()
                logger.info(f"[usher_scan_logs_list] Logs with event_id as int {event_id_int}: {alt_logs}")
                # Also check recent logs to see what event_ids they have
                recent_logs = CheckinLog.objects.select_related('event').order_by('-timestamp')[:5]
                for log in recent_logs:
                    logger.info(f"[usher_scan_logs_list] Recent log: id={log.id}, event_id={log.event_id}, event__id={log.event.id if log.event else None}, card={log.nfc_card.serial_number if log.nfc_card else None}")
            except Exception as e:
                logger.error(f"[usher_scan_logs_list] Error checking event_id formats: {str(e)}", exc_info=True)
    
    return Response({
        'results': serializer.data,
        'count': total_count,
        'next': page_obj.next_page_number() if page_obj.has_next() else None,
        'previous': page_obj.previous_page_number() if page_obj.has_previous() else None,
        'page': page_obj.number,
        'total_pages': paginator.num_pages
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_logs_search(request):
    """
    Search scan logs.
    GET /api/usher/scan/logs/search/
    """
    serializer = ScanLogSearchSerializer(data=request.query_params)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    # Show all logs for the event, not just current usher
    logs = CheckinLog.objects.select_related('operator', 'event', 'customer', 'nfc_card')
    
    # Apply filters
    if serializer.validated_data.get('card_id'):
        logs = logs.filter(nfc_card__serial_number=serializer.validated_data['card_id'])
    
    if serializer.validated_data.get('result'):
        result_map = {
            'valid': 'success',
            'invalid': 'invalid',
            'already_scanned': 'duplicate',
            'not_found': 'failed'
        }
        logs = logs.filter(scan_result=result_map.get(serializer.validated_data['result'], 'failed'))
    
    if serializer.validated_data.get('event_id'):
        logs = logs.filter(event_id=serializer.validated_data['event_id'])
    
    if serializer.validated_data.get('attendee_name'):
        logs = logs.filter(customer__name__icontains=serializer.validated_data['attendee_name'])
    
    logs = logs.order_by('-timestamp')[:50]  # Limit to 50 results
    
    serializer = ScanLogSerializer(logs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_part_time_leave(request):
    """
    Log part-time leave or return from leave.
    POST /api/usher/scan/part-time-leave/
    Body: { "event_id": 1, "card_id": "card123", "reason": "...", "return": true/false }
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    event_id = request.data.get('event_id')
    reason = request.data.get('reason') or request.data.get('comment', '')
    card_id = request.data.get('card_id')  # Optional - for tracking which attendee
    is_return = request.data.get('return', False)  # If True, mark as return
    
    if not event_id:
        raise ValidationError("event_id is required")
    
    try:
        # Handle both integer and UUID event IDs
        try:
            event_id_int = int(event_id)
            event = Event.objects.get(id=event_id_int)
        except (ValueError, TypeError):
            # Try as UUID
            event = Event.objects.get(id=event_id)
    except (Event.DoesNotExist, ValueError, TypeError):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # If card_id provided, try to get customer info for notes
    customer_name = None
    customer = None
    if card_id:
        try:
            card = NFCCard.objects.get(serial_number=card_id.strip())
            if card.customer:
                customer = card.customer
                customer_name = card.customer.name
                if reason:
                    reason = f"{customer_name}: {reason}"
                else:
                    if is_return:
                        reason = f"Returned from part-time leave: {customer_name}"
                    else:
                        reason = f"Part-time leave for {customer_name}"
        except NFCCard.DoesNotExist:
            pass
    
    if is_return and card_id and customer:
        # Mark the most recent active leave as returned
        active_leaves = PartTimeLeave.objects.filter(
            usher=usher,
            event=event,
            return_time__isnull=True
        ).order_by('-leave_time')
        
        # Try to find leave for this customer by matching reason
        leave_to_update = None
        for leave in active_leaves:
            if customer_name and customer_name in (leave.reason or ''):
                leave_to_update = leave
                break
        
        # If no specific match, update the most recent one
        if not leave_to_update and active_leaves.exists():
            leave_to_update = active_leaves.first()
        
        if leave_to_update:
            try:
                leave_to_update.return_time = timezone.now()
                if reason:
                    leave_to_update.reason = f"{leave_to_update.reason} - {reason}"
                leave_to_update.save()
                serializer = PartTimeLeaveSerializer(leave_to_update)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Exception as e:
                # Log the full error for debugging
                import logging
                import traceback
                logger = logging.getLogger(__name__)
                logger.error(f"Error updating part-time leave return: {str(e)}")
                logger.error(traceback.format_exc())
                return Response({
                    'error': {'code': 'INTERNAL_ERROR', 'message': f'Failed to update part-time leave: {str(e)}'}
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Create new leave record
    try:
        leave = PartTimeLeave.objects.create(
            usher=usher,
            event=event,
            leave_time=timezone.now(),
            reason=reason or 'Part-time leave'
        )
        
        serializer = PartTimeLeaveSerializer(leave)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        # Log the full error for debugging
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error creating part-time leave: {str(e)}")
        logger.error(traceback.format_exc())
        return Response({
            'error': {'code': 'INTERNAL_ERROR', 'message': f'Failed to create part-time leave: {str(e)}'}
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_part_time_leave_list(request):
    """
    Get part-time leave history.
    GET /api/usher/scan/part-time-leave/
    """
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    leaves = PartTimeLeave.objects.filter(usher=usher).order_by('-leave_time')
    
    serializer = PartTimeLeaveSerializer(leaves, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_scan_report(request):
    """
    Report scan issue or incident.
    POST /api/usher/scan/report/
    """
    serializer = ScanReportSerializer(data=request.data)
    if not serializer.is_valid():
        raise ValidationError(serializer.errors)
    
    if not hasattr(request, 'usher') or request.usher is None:
        return Response({
            'error': {'code': 'AUTHENTICATION_ERROR', 'message': 'Usher not authenticated'}
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    usher = request.usher
    
    report = ScanReport.objects.create(
        usher=usher,
        event_id=serializer.validated_data['event'],
        report_type=serializer.validated_data['report_type'],
        description=serializer.validated_data['description'],
        card_id=serializer.validated_data.get('card_id'),
        ticket_id=serializer.validated_data.get('ticket_id'),
        customer_id=serializer.validated_data.get('customer_id')
    )
    
    serializer = ScanReportSerializer(report)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_sync_attendees(request):
    """
    Get attendees for event (for offline cache).
    GET /api/usher/sync/attendees/?event_id=uuid
    """
    event_id = request.query_params.get('event_id')
    if not event_id:
        raise ValidationError("event_id is required")
    
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get all tickets for this event
    tickets = Ticket.objects.filter(event=event, status__in=['valid', 'used']).select_related('customer')
    
    attendees = []
    for ticket in tickets:
        if ticket.customer:
            card = NFCCard.objects.filter(customer=ticket.customer).first()
            attendees.append({
                'customer_id': str(ticket.customer.id),
                'name': ticket.customer.name,
                'card_id': card.serial_number if card else None,
                'ticket_id': str(ticket.id),
                'ticket_status': ticket.status,
                'ticket_tier': ticket.category.lower() if ticket.category else 'standard'
            })
    
    return Response({'attendees': attendees}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_sync_cards(request):
    """
    Get card data for event.
    GET /api/usher/sync/cards/?event_id=uuid
    """
    event_id = request.query_params.get('event_id')
    if not event_id:
        raise ValidationError("event_id is required")
    
    try:
        event = Event.objects.get(id=event_id)
    except Event.DoesNotExist:
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get all cards for customers with tickets for this event
    tickets = Ticket.objects.filter(event=event).select_related('customer')
    customer_ids = [t.customer.id for t in tickets if t.customer]
    
    cards = NFCCard.objects.filter(customer_id__in=customer_ids)
    
    card_data = []
    for card in cards:
        card_data.append({
            'card_id': card.serial_number,
            'customer_id': str(card.customer.id) if card.customer else None,
            'status': card.status
        })
    
    return Response({'cards': card_data}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_nfc_status(request):
    """
    Get NFC availability status.
    GET /api/usher/nfc/status/
    """
    return Response({
        'nfc_available': True,  # Browser will check actual NFC support
        'message': 'NFC status check'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_sync_logs(request):
    """
    Sync offline scan logs to server.
    POST /api/usher/sync/logs/
    Body: { "logs": [...] }
    """
    logs = request.data.get('logs', [])
    if not logs:
        return Response({
            'error': {'code': 'VALIDATION_ERROR', 'message': 'logs array is required'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    synced_count = 0
    errors = []
    
    for log_data in logs:
        try:
            # Create or update checkin log
            card_id = log_data.get('cardId') or log_data.get('card_id')
            event_id = log_data.get('eventId') or log_data.get('event_id')
            result = log_data.get('result') or log_data.get('scan_result', 'Unknown')
            
            if not card_id or not event_id:
                errors.append({'log': log_data, 'error': 'Missing card_id or event_id'})
                continue
            
            # Get ticket if available
            ticket = None
            try:
                card = NFCCard.objects.get(serial_number=card_id.strip())
                if card.customer:
                    ticket = Ticket.objects.filter(
                        customer=card.customer,
                        event_id=int(event_id)
                    ).first()
            except (NFCCard.DoesNotExist, ValueError, Ticket.DoesNotExist):
                pass
            
            # Create checkin log
            CheckinLog.objects.create(
                usher=request.usher,
                event_id=int(event_id),
                ticket=ticket,
                customer=card.customer if ticket and hasattr(ticket, 'customer') else None,
                scan_result=result,
                scan_time=log_data.get('time') or timezone.now(),
                notes=log_data.get('notes', '')
            )
            synced_count += 1
        except Exception as e:
            errors.append({'log': log_data, 'error': str(e)})
    
    return Response({
        'synced': synced_count,
        'total': len(logs),
        'errors': errors if errors else None
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_sync_status(request):
    """
    Get sync status.
    GET /api/usher/sync/status/
    """
    # Get pending logs count (if we had a way to track them)
    # For now, just return basic status
    return Response({
        'sync_enabled': True,
        'last_sync': None,  # Could track this in a model
        'pending_logs': 0
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_nfc_test(request):
    """
    Test NFC connection.
    GET /api/usher/nfc/test/
    """
    return Response({
        'nfc_test': True,
        'message': 'NFC test endpoint - actual NFC testing is done on device'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def usher_refresh_token(request):
    """
    Refresh JWT token.
    POST /api/usher/refresh/
    Body: { "refresh": "refresh_token_string" }
    """
    from rest_framework_simplejwt.tokens import RefreshToken
    from rest_framework_simplejwt.exceptions import TokenError
    
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({
            'error': {'code': 'VALIDATION_ERROR', 'message': 'refresh token is required'}
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        refresh = RefreshToken(refresh_token)
        access_token = refresh.access_token
        
        return Response({
            'access': str(access_token),
            'refresh': str(refresh)
        }, status=status.HTTP_200_OK)
    except TokenError as e:
        return Response({
            'error': {'code': 'TOKEN_ERROR', 'message': str(e)}
        }, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsUsherPortal])
@authentication_classes([UsherJWTAuthentication])
def usher_event_status(request, event_id):
    """
    Get real-time event status.
    GET /api/usher/events/:id/status/
    """
    try:
        event = Event.objects.get(id=int(event_id))
    except (Event.DoesNotExist, ValueError):
        return Response({
            'error': {'code': 'NOT_FOUND', 'message': 'Event not found'}
        }, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'event_id': event_id,
        'status': event.status,
        'is_active': event.status == 'ongoing',
        'scanning_enabled': event.status in ['ongoing', 'scheduled', 'upcoming']
    }, status=status.HTTP_200_OK)

