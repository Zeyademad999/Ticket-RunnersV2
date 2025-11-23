"""
Views for authentication app.
"""
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import update_session_auth_hash
from core.exceptions import AuthenticationError, ValidationError
from core.utils import get_client_ip, log_system_action
from core.rate_limiting import rate_limit
from .models import AdminUser
from .serializers import AdminUserSerializer, LoginSerializer, ChangePasswordSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
@rate_limit('login', limit=100, window=60)  # 100 attempts per minute for testing
def login_view(request):
    """
    Login endpoint for admin users.
    POST /api/auth/login/
    """
    try:
        serializer = LoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            # Return 400 for validation errors (missing fields, etc.)
            raise ValidationError(
                detail='Invalid input data.',
                details=serializer.errors
            )
        
        user = serializer.validated_data.get('user')
        
        if not user:
            # This should not happen if serializer is valid, but just in case
            raise AuthenticationError('Invalid credentials.')
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Update last login
        user.save(update_fields=['last_login'])
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=user,
            action='LOGIN',
            category='authentication',
            severity='INFO',
            description=f'User {user.username} logged in',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': AdminUserSerializer(user).data
        }, status=status.HTTP_200_OK)
    except AuthenticationError:
        # Re-raise authentication errors as-is (401)
        raise
    except ValidationError:
        # Re-raise validation errors as-is (400)
        raise
    except Exception as e:
        # Catch any other unexpected errors
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Unexpected error in login_view: {str(e)}", exc_info=True)
        raise AuthenticationError('An error occurred during login. Please try again.')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint for admin users.
    POST /api/auth/logout/
    """
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Token might already be blacklisted or invalid
                pass
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=request.user,
            action='LOGOUT',
            category='authentication',
            severity='INFO',
            description=f'User {request.user.username} logged out',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response({
            'message': 'Logged out successfully'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': {
                'code': 'LOGOUT_ERROR',
                'message': str(e)
            }
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Get current user profile.
    GET /api/auth/me/
    """
    serializer = AdminUserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


class ChangePasswordView(generics.UpdateAPIView):
    """
    Change password endpoint.
    PUT /api/auth/change-password/
    """
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            raise ValidationError(
                detail='Invalid input data.',
                details=serializer.errors
            )
        
        # Check old password
        if not user.check_password(serializer.validated_data['old_password']):
            raise AuthenticationError('Old password is incorrect.')
        
        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Update session to prevent logout
        update_session_auth_hash(request, user)
        
        # Log system action
        ip_address = get_client_ip(request)
        log_system_action(
            user=user,
            action='PASSWORD_CHANGE',
            category='authentication',
            severity='INFO',
            description=f'User {user.username} changed password',
            ip_address=ip_address,
            status='SUCCESS'
        )
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)
