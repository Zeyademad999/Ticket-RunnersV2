"""
Views for users app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin, IsSuperAdmin, HasPermission
from core.exceptions import ValidationError
from .models import Organizer, Usher, Merchant, MerchantLocation, OrganizerEditRequest
from authentication.models import AdminUser
from authentication.serializers import AdminUserSerializer as AuthAdminUserSerializer
from .serializers import OrganizerSerializer, UsherSerializer, MerchantSerializer, MerchantLocationSerializer


class OrganizerViewSet(viewsets.ModelViewSet):
    queryset = Organizer.objects.select_related('user').all()
    serializer_class = OrganizerSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def destroy(self, request, *args, **kwargs):
        """
        Override destroy to add proper error handling.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            organizer = self.get_object()
            organizer_id = organizer.id
            organizer_name = organizer.name
            
            # Log related objects before deletion
            from events.models import Event
            from finances.models import Payout
            
            events_count = Event.objects.filter(organizer=organizer).count()
            payouts_count = Payout.objects.filter(organizer=organizer).count()
            
            # Safely count edit requests (table might not exist in some edge cases)
            edit_requests_count = 0
            try:
                edit_requests_count = organizer.profile_edit_requests.count()
            except Exception as e:
                logger.warning(f"Could not count edit requests: {str(e)}")
            
            logger.info(f"Deleting organizer ID={organizer_id}, name='{organizer_name}'")
            logger.info(f"Related objects: Events={events_count}, Payouts={payouts_count}, EditRequests={edit_requests_count}")
            
            # Perform deletion
            organizer.delete()
            
            logger.info(f"Successfully deleted organizer ID={organizer_id}")
            return Response(
                {'message': f'Organizer "{organizer_name}" deleted successfully'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error deleting organizer: {str(e)}", exc_info=True)
            return Response(
                {
                    'error': {
                        'code': 'DELETE_ERROR',
                        'message': f'Failed to delete organizer: {str(e)}'
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['put'])
    def verify(self, request, pk=None):
        organizer = self.get_object()
        organizer.verified = True
        organizer.save()
        return Response(OrganizerSerializer(organizer).data)
    
    @action(detail=True, methods=['post'])
    def create_credentials(self, request, pk=None):
        """
        Create portal credentials for an organizer.
        POST /api/organizers/{id}/create_credentials/
        Body: { "mobile": "01123456789", "password": "password123" }
        """
        organizer = self.get_object()
        
        mobile = request.data.get('mobile')
        password = request.data.get('password')
        
        if not mobile:
            raise ValidationError("Mobile number is required")
        
        if not password:
            raise ValidationError("Password is required")
        
        if len(password) < 6:
            raise ValidationError("Password must be at least 6 characters long")
        
        # Normalize mobile number: strip whitespace and ensure consistent format
        mobile = mobile.strip()
        
        # Set mobile and status first
        organizer.contact_mobile = mobile
        organizer.status = 'active'  # Activate organizer when credentials are created
        
        # Hash password manually to avoid double save
        from django.contrib.auth.hashers import make_password
        organizer.password = make_password(password)
        
        # Save all fields together (mobile, status, password)
        organizer.save()
        
        # Log for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Credentials created for organizer ID={organizer.id}, mobile='{organizer.contact_mobile}', status={organizer.status}, has_password={bool(organizer.password)}")
        
        return Response({
            'message': 'Credentials created successfully',
            'organizer': OrganizerSerializer(organizer).data
        }, status=status.HTTP_200_OK)


class OrganizerEditRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organizer edit requests (admin only).
    """
    queryset = OrganizerEditRequest.objects.select_related('organizer', 'processed_by').all()
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['status', 'organizer']
    
    def get_serializer_class(self):
        from apps.organizer_portal.serializers import OrganizerEditRequestSerializer
        return OrganizerEditRequestSerializer
    
    def get_queryset(self):
        """Filter by status if provided."""
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve an edit request and apply changes to organizer profile.
        POST /api/organizers/edit-requests/{id}/approve/
        """
        import logging
        from django.utils import timezone
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.core.exceptions import FieldDoesNotExist
        from apps.organizer_portal.serializers import OrganizerProfileSerializer
        
        logger = logging.getLogger(__name__)
        
        try:
            edit_request = self.get_object()
            
            if edit_request.status != 'pending':
                return Response({
                    'error': {'message': 'Only pending requests can be approved'}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            organizer = edit_request.organizer
            # Handle requested_data - it should be a dict, but might be stored as string
            requested_data = edit_request.requested_data or {}
            if isinstance(requested_data, str):
                try:
                    import json
                    requested_data = json.loads(requested_data)
                except (json.JSONDecodeError, ValueError):
                    logger.warning(f"Invalid JSON in requested_data: {requested_data}")
                    requested_data = {}
            if not isinstance(requested_data, dict):
                requested_data = {}
            
            # Fields that should not be updated directly (read-only or computed)
            readonly_fields = {'id', 'user', 'total_events', 'total_revenue', 'registration_date', 'created_at', 'updated_at'}
            
            # Check for email uniqueness if email is being changed
            if 'email' in requested_data and requested_data['email'] != organizer.email:
                email = requested_data['email']
                if Organizer.objects.filter(email=email).exclude(id=organizer.id).exists():
                    return Response({
                        'error': {
                            'message': 'Email already exists',
                            'details': f'Another organizer already uses the email: {email}'
                        }
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Apply requested changes to organizer
            for field, value in requested_data.items():
                if field in readonly_fields:
                    continue
                if field == 'profile_image':
                    continue  # Handle separately
                if hasattr(organizer, field):
                    try:
                        # Check if field exists in model meta
                        try:
                            field_obj = organizer._meta.get_field(field)
                            # Validate choice field if it has choices
                            if hasattr(field_obj, 'choices') and field_obj.choices:
                                valid_choices = [choice[0] for choice in field_obj.choices]
                                if value not in valid_choices:
                                    logger.warning(f"Invalid choice value '{value}' for field '{field}', skipping")
                                    continue
                        except (AttributeError, ValueError, TypeError, FieldDoesNotExist) as e:
                            logger.warning(f"Field '{field}' not found in model or error accessing it: {str(e)}, skipping")
                            continue
                        
                        # Set the field value
                        setattr(organizer, field, value)
                    except (AttributeError, ValueError, TypeError) as e:
                        logger.warning(f"Error setting field '{field}': {str(e)}, skipping")
                        continue
            
            # Handle profile image
            if edit_request.profile_image:
                organizer.profile_image = edit_request.profile_image
            elif requested_data.get('profile_image') is None:
                organizer.profile_image = None
            
            # Validate and save organizer
            try:
                organizer.full_clean()
                organizer.save()
            except DjangoValidationError as e:
                logger.error(f"Validation error when saving organizer: {str(e)}")
                return Response({
                    'error': {
                        'message': 'Validation error when applying changes',
                        'details': str(e)
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error saving organizer: {str(e)}", exc_info=True)
                return Response({
                    'error': {
                        'message': 'Error applying changes to organizer profile',
                        'details': str(e)
                    }
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Update edit request
            edit_request.status = 'approved'
            # Ensure request.user is an AdminUser instance
            if hasattr(request.user, 'id'):
                try:
                    from authentication.models import AdminUser
                    admin_user = AdminUser.objects.get(id=request.user.id)
                    edit_request.processed_by = admin_user
                except AdminUser.DoesNotExist:
                    logger.warning(f"User {request.user.id} is not an AdminUser, setting processed_by to None")
                    edit_request.processed_by = None
            else:
                edit_request.processed_by = None
            edit_request.processed_at = timezone.now()
            
            try:
                edit_request.save()
            except Exception as e:
                logger.error(f"Error saving edit request: {str(e)}", exc_info=True)
                return Response({
                    'error': {
                        'message': 'Error updating edit request status',
                        'details': str(e)
                    }
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Operation succeeded, now try to serialize response
            # Even if serialization fails, return success since the operation completed
            try:
                serializer = OrganizerEditRequestSerializer(edit_request, context={'request': request})
                response_data = {
                    'message': 'Edit request approved and changes applied successfully',
                    'request': serializer.data
                }
                
                # Try to include organizer data, but don't fail if it errors
                try:
                    organizer_serializer = OrganizerProfileSerializer(organizer, context={'request': request})
                    response_data['organizer'] = organizer_serializer.data
                except Exception as serializer_error:
                    logger.warning(f"Error serializing organizer data: {str(serializer_error)}, continuing without it")
                    # Include basic organizer info instead
                    response_data['organizer'] = {
                        'id': str(organizer.id),
                        'name': organizer.name,
                        'email': organizer.email
                    }
                
                return Response(response_data, status=status.HTTP_200_OK)
            except Exception as e:
                # Serialization failed, but operation succeeded - return success with basic data
                logger.warning(f"Error serializing response (operation succeeded): {str(e)}", exc_info=True)
                return Response({
                    'message': 'Edit request approved and changes applied successfully',
                    'request': {
                        'id': edit_request.id,
                        'status': edit_request.status,
                        'organizer_name': organizer.name,
                        'organizer_email': organizer.email,
                        'processed_at': edit_request.processed_at.isoformat() if edit_request.processed_at else None
                    }
                }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in approve method: {str(e)}", exc_info=True)
            return Response({
                'error': {
                    'message': 'An error occurred while approving the request',
                    'details': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject an edit request.
        POST /api/organizers/edit-requests/{id}/reject/
        Body: { "rejection_reason": "Optional reason for rejection" }
        """
        import logging
        from django.utils import timezone
        
        logger = logging.getLogger(__name__)
        
        try:
            edit_request = self.get_object()
            
            if edit_request.status != 'pending':
                return Response({
                    'error': {'message': 'Only pending requests can be rejected'}
                }, status=status.HTTP_400_BAD_REQUEST)
            
            rejection_reason = request.data.get('rejection_reason', '') if hasattr(request, 'data') else ''
            
            # Update edit request
            edit_request.status = 'rejected'
            # Ensure request.user is an AdminUser instance
            if hasattr(request.user, 'id'):
                try:
                    from authentication.models import AdminUser
                    admin_user = AdminUser.objects.get(id=request.user.id)
                    edit_request.processed_by = admin_user
                except AdminUser.DoesNotExist:
                    logger.warning(f"User {request.user.id} is not an AdminUser, setting processed_by to None")
                    edit_request.processed_by = None
            else:
                edit_request.processed_by = None
            edit_request.processed_at = timezone.now()
            edit_request.rejection_reason = rejection_reason
            
            try:
                edit_request.save()
            except Exception as e:
                logger.error(f"Error saving edit request: {str(e)}", exc_info=True)
                return Response({
                    'error': {
                        'message': 'Error updating edit request status',
                        'details': str(e)
                    }
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Operation succeeded, now try to serialize response
            # Even if serialization fails, return success since the operation completed
            try:
                serializer = OrganizerEditRequestSerializer(edit_request, context={'request': request})
                return Response({
                    'message': 'Edit request rejected',
                    'request': serializer.data
                }, status=status.HTTP_200_OK)
            except Exception as e:
                # Serialization failed, but operation succeeded - return success with basic data
                logger.warning(f"Error serializing response (operation succeeded): {str(e)}", exc_info=True)
                return Response({
                    'message': 'Edit request rejected',
                    'request': {
                        'id': edit_request.id,
                        'status': edit_request.status,
                        'organizer_name': edit_request.organizer.name,
                        'organizer_email': edit_request.organizer.email,
                        'rejection_reason': edit_request.rejection_reason,
                        'processed_at': edit_request.processed_at.isoformat() if edit_request.processed_at else None
                    }
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error in reject method: {str(e)}", exc_info=True)
            return Response({
                'error': {
                    'message': 'An error occurred while rejecting the request',
                    'details': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UsherViewSet(viewsets.ModelViewSet):
    queryset = Usher.objects.select_related('user').prefetch_related('events').all()
    serializer_class = UsherSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Override to set permissions based on action.
        """
        if self.action == 'create':
            return [IsAuthenticated(), HasPermission("ushers_create")]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasPermission("ushers_edit")]
        elif self.action == 'destroy':
            return [IsAuthenticated(), HasPermission("ushers_delete")]
        elif self.action == 'list' or self.action == 'retrieve':
            return [IsAuthenticated(), HasPermission("ushers_view")]
        elif self.action == 'create_credentials':
            return [IsAuthenticated(), HasPermission("ushers_manage_credentials")]
        elif self.action == 'assign_event':
            return [IsAuthenticated(), HasPermission("ushers_assign_events")]
        return [IsAuthenticated()]
    
    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def create(self, request, *args, **kwargs):
        """Override create to handle errors better"""
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': serializer.errors},
                status=400
            )
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)
    
    @action(detail=True, methods=['post'])
    def create_credentials(self, request, pk=None):
        """
        Create EVS portal credentials for an usher.
        POST /api/ushers/{id}/create_credentials/
        Body: { 
            "username": "usher1", 
            "password": "password123",
            "event_ids": [1, 2, 3]  // Optional: assign to events
        }
        """
        usher = self.get_object()
        
        username = request.data.get('username')
        password = request.data.get('password')
        event_ids = request.data.get('event_ids', [])
        
        if not username:
            raise ValidationError("Username is required")
        
        if not password:
            raise ValidationError("Password is required")
        
        if len(password) < 6:
            raise ValidationError("Password must be at least 6 characters long")
        
        # Check if username already exists (for different usher)
        existing_user = AdminUser.objects.filter(username=username).exclude(id=usher.user.id if usher.user else None).first()
        if existing_user:
            raise ValidationError(f"Username '{username}' is already taken by another user")
        
        # Create or update AdminUser
        if usher.user:
            # Update existing AdminUser
            admin_user = usher.user
            admin_user.username = username
            admin_user.set_password(password)
            admin_user.role = 'USHER'
            admin_user.is_active = True
            admin_user.save()
        else:
            # Create new AdminUser
            admin_user = AdminUser.objects.create_user(
                username=username,
                email=usher.email,
                password=password,
                role='USHER',
                is_active=True,
                is_staff=False,
            )
            usher.user = admin_user
        
        # Activate usher and save (saves both user link and status)
        usher.status = 'active'
        usher.save()
        
        # Assign to events if provided
        if event_ids:
            from events.models import Event
            events = Event.objects.filter(id__in=event_ids)
            if events.count() != len(event_ids):
                raise ValidationError("Some event IDs are invalid")
            usher.events.set(events)
        
        return Response({
            'message': 'EVS credentials created successfully',
            'usher': UsherSerializer(usher).data,
            'username': username,
            'assigned_events': [e.id for e in usher.events.all()]
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def assign_event(self, request, pk=None):
        """
        Assign usher to one or more events.
        POST /api/ushers/{id}/assign_event/
        Body: { "event_ids": [1, 2, 3] }
        """
        usher = self.get_object()
        event_ids = request.data.get('event_ids', [])
        
        if not event_ids:
            raise ValidationError("event_ids is required")
        
        from events.models import Event
        events = Event.objects.filter(id__in=event_ids)
        
        if events.count() != len(event_ids):
            invalid_ids = set(event_ids) - set(events.values_list('id', flat=True))
            raise ValidationError(f"Invalid event IDs: {list(invalid_ids)}")
        
        # Add events to usher (preserves existing assignments)
        usher.events.add(*events)
        
        return Response({
            'message': f'Usher assigned to {events.count()} event(s)',
            'usher': UsherSerializer(usher).data,
            'assigned_events': [e.id for e in usher.events.all()]
        }, status=status.HTTP_200_OK)


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = AdminUser.objects.all()
    serializer_class = AuthAdminUserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Override to set permissions based on action.
        """
        if self.action == 'create':
            return [IsAuthenticated(), HasPermission("admins_create")]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasPermission("admins_edit")]
        elif self.action == 'destroy':
            return [IsAuthenticated(), HasPermission("admins_delete")]
        elif self.action == 'list' or self.action == 'retrieve':
            return [IsAuthenticated(), HasPermission("admins_view")]
        return [IsAuthenticated()]


class MerchantViewSet(viewsets.ModelViewSet):
    queryset = Merchant.objects.select_related('user').all()
    serializer_class = MerchantSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """
        Override to set permissions based on action.
        """
        if self.action == 'create':
            return [IsAuthenticated(), HasPermission("merchants_create")]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), HasPermission("merchants_edit")]
        elif self.action == 'destroy':
            return [IsAuthenticated(), HasPermission("merchants_delete")]
        elif self.action == 'list' or self.action == 'retrieve':
            return [IsAuthenticated(), HasPermission("merchants_view")]
        elif self.action == 'create_credentials':
            return [IsAuthenticated(), HasPermission("merchants_manage_credentials")]
        elif self.action == 'assign_cards':
            return [IsAuthenticated(), HasPermission("merchants_edit")]
        return [IsAuthenticated()]
    
    @action(detail=True, methods=['put'])
    def verify(self, request, pk=None):
        merchant = self.get_object()
        merchant.verification_status = 'verified'
        merchant.save()
        return Response(MerchantSerializer(merchant).data)
    
    @action(detail=True, methods=['post'])
    def create_credentials(self, request, pk=None):
        """
        Create portal credentials for a merchant.
        POST /api/merchants/{id}/create_credentials/
        Body: { "mobile": "01123456789", "password": "password123" }
        """
        merchant = self.get_object()
        
        mobile = request.data.get('mobile')
        password = request.data.get('password')
        
        if not mobile:
            raise ValidationError("Mobile number is required")
        
        if not password:
            raise ValidationError("Password is required")
        
        if len(password) < 6:
            raise ValidationError("Password must be at least 6 characters long")
        
        # Set mobile and password
        merchant.mobile_number = mobile
        merchant.set_password(password)
        merchant.status = 'active'  # Activate merchant when credentials are created
        merchant.save()
        
        return Response({
            'message': 'Credentials created successfully',
            'merchant': MerchantSerializer(merchant).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def assign_cards(self, request, pk=None):
        """
        Assign a number of NFC cards to a merchant.
        POST /api/merchants/{id}/assign_cards/
        Body: { "number_of_cards": 10 }
        """
        from nfc_cards.models import NFCCard
        from django.db import transaction
        
        merchant = self.get_object()
        number_of_cards = request.data.get('number_of_cards')
        
        if not number_of_cards:
            raise ValidationError("number_of_cards is required")
        
        try:
            number_of_cards = int(number_of_cards)
        except (ValueError, TypeError):
            raise ValidationError("number_of_cards must be a valid integer")
        
        if number_of_cards <= 0:
            raise ValidationError("number_of_cards must be greater than 0")
        
        # Get available unassigned cards (not assigned to any customer and not assigned to any merchant)
        available_cards = NFCCard.objects.filter(
            status='active',
            customer__isnull=True,  # Not assigned to any customer
            merchant__isnull=True   # Not assigned to any merchant
        )[:number_of_cards]
        
        available_count = available_cards.count()
        
        if available_count < number_of_cards:
            return Response({
                'error': {
                    'code': 'INSUFFICIENT_CARDS',
                    'message': f'Only {available_count} cards available. Requested {number_of_cards} cards.'
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Assign cards to merchant
        with transaction.atomic():
            assigned_cards = []
            for card in available_cards:
                card.merchant = merchant
                card.save()
                assigned_cards.append(card.serial_number)
        
        return Response({
            'message': f'Successfully assigned {len(assigned_cards)} cards to merchant',
            'assigned_count': len(assigned_cards),
            'assigned_cards': assigned_cards,
            'merchant': MerchantSerializer(merchant).data
        }, status=status.HTTP_200_OK)


class MerchantLocationViewSet(viewsets.ModelViewSet):
    queryset = MerchantLocation.objects.select_related('merchant').all()
    serializer_class = MerchantLocationSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_permissions(self):
        """
        Override to set permissions based on action.
        HasPermission already handles super admin bypass, so we just need to add IsAdmin.
        """
        if self.action == 'create':
            return [IsAuthenticated(), IsAdmin(), HasPermission("merchants_create")]
        elif self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), IsAdmin(), HasPermission("merchants_edit")]
        elif self.action == 'destroy':
            return [IsAuthenticated(), IsAdmin(), HasPermission("merchants_delete")]
        elif self.action == 'list' or self.action == 'retrieve':
            return [IsAuthenticated(), IsAdmin(), HasPermission("merchants_view")]
        return [IsAuthenticated(), IsAdmin()]