"""
Permission decorator for checking admin user permissions.
"""
from functools import wraps
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status


def require_permission(permission_name: str):
    """
    Decorator to check if user has a specific permission.
    
    Usage:
        @require_permission("events_create")
        def create(self, request):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(self, request, *args, **kwargs):
            # Check if user is authenticated
            if not request.user or not request.user.is_authenticated:
                raise PermissionDenied("Authentication required.")
            
            # Check if user has the permission
            if hasattr(request.user, 'has_permission'):
                if not request.user.has_permission(permission_name):
                    raise PermissionDenied(
                        detail=f"You do not have permission to perform this action. Required permission: {permission_name}",
                        code="PERMISSION_DENIED"
                    )
            else:
                # Fallback: check if user is super admin
                if not (hasattr(request.user, 'is_superuser') and request.user.is_superuser):
                    raise PermissionDenied("Permission denied.")
            
            return func(self, request, *args, **kwargs)
        return wrapper
    return decorator


def require_permission_view(permission_name: str):
    """
    Decorator for function-based views to check permissions.
    
    Usage:
        @require_permission_view("events_create")
        @api_view(['POST'])
        def create_event(request):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            # Check if user is authenticated
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {"error": {"message": "Authentication required.", "code": "AUTHENTICATION_REQUIRED"}},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Check if user has the permission
            if hasattr(request.user, 'has_permission'):
                if not request.user.has_permission(permission_name):
                    return Response(
                        {
                            "error": {
                                "message": f"You do not have permission to perform this action. Required permission: {permission_name}",
                                "code": "PERMISSION_DENIED"
                            }
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                # Fallback: check if user is super admin
                if not (hasattr(request.user, 'is_superuser') and request.user.is_superuser):
                    return Response(
                        {"error": {"message": "Permission denied.", "code": "PERMISSION_DENIED"}},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            return func(request, *args, **kwargs)
        return wrapper
    return decorator

