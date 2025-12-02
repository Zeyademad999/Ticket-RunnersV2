"""
Custom permission classes for role-based access control.
"""
from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """
    Permission class that allows access only to Super Admin users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role == 'SUPER_ADMIN'
        )


class IsAdmin(permissions.BasePermission):
    """
    Permission class that allows access to Admin and Super Admin users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['ADMIN', 'SUPER_ADMIN']
        )


class IsUsher(permissions.BasePermission):
    """
    Permission class that allows access to Usher, Admin, and Super Admin users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['USHER', 'ADMIN', 'SUPER_ADMIN']
        )


class IsSupport(permissions.BasePermission):
    """
    Permission class that allows access to Support, Admin, and Super Admin users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role in ['SUPPORT', 'ADMIN', 'SUPER_ADMIN']
        )


class IsOrganizer(permissions.BasePermission):
    """
    Permission class that allows access only to authenticated organizers.
    Checks if request has organizer attribute set by custom authentication.
    """
    
    def has_permission(self, request, view):
        # First check if user is authenticated (has a user object)
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Then check if organizer is set on request
        return (
            hasattr(request, 'organizer') and
            request.organizer is not None
        )


class IsMerchant(permissions.BasePermission):
    """
    Permission class that allows access only to authenticated merchants.
    Checks if request has merchant attribute set by custom authentication.
    """
    
    def has_permission(self, request, view):
        return (
            hasattr(request, 'merchant') and
            request.merchant is not None
        )


class IsCustomer(permissions.BasePermission):
    """
    Permission class that allows access only to authenticated customers.
    Checks if request has customer attribute set by custom authentication.
    If customer is set, authentication succeeded, so we allow access.
    """
    
    def has_permission(self, request, view):
        import logging
        logger = logging.getLogger('core.permissions')
        
        # First check if customer is set on request (set by CustomerJWTAuthentication)
        if hasattr(request, 'customer') and request.customer is not None:
            logger.info(f"IsCustomer: Permission granted for customer {request.customer.id}")
            return True
        
        # If no customer attribute, check if user is authenticated and try to get customer from user.id
        # This handles the case where CustomerJWTAuthentication set request.user but customer wasn't set
        if request.user and hasattr(request.user, 'is_authenticated'):
            is_authenticated = request.user.is_authenticated
            if callable(is_authenticated):
                is_authenticated = is_authenticated()
            
            if is_authenticated and hasattr(request.user, 'id'):
                user_id = request.user.id
                # Try to find customer by user.id (CustomerJWTAuthentication sets user.id = customer.id)
                from customers.models import Customer
                try:
                    customer = Customer.objects.get(id=user_id)
                    # Set customer on request for future use
                    request.customer = customer
                    logger.info(f"IsCustomer: Found customer {customer.id} from user.id ({user_id})")
                    return True
                except Customer.DoesNotExist:
                    logger.warning(f"IsCustomer: No customer found with user.id: {user_id}")
                except Exception as e:
                    logger.error(f"IsCustomer: Error looking up customer by user.id: {str(e)}")
        
        logger.warning(f"IsCustomer: Permission denied - no customer found. User: {request.user}, has customer attr: {hasattr(request, 'customer')}")
        return False


class OrganizerCanAccessEvent(permissions.BasePermission):
    """
    Permission class that checks if organizer owns the event.
    """
    
    def has_object_permission(self, request, view, obj):
        if not hasattr(request, 'organizer') or not request.organizer:
            return False
        return obj.organizer == request.organizer


class MerchantCanAccessCard(permissions.BasePermission):
    """
    Permission class that checks if merchant assigned the card.
    """
    
    def has_object_permission(self, request, view, obj):
        if not hasattr(request, 'merchant') or not request.merchant:
            return False
        return obj.merchant == request.merchant


class HasPermission(permissions.BasePermission):
    """
    Permission class that checks if user has a specific permission.
    Usage: HasPermission("events_create")
    """
    
    def __init__(self, permission_name: str):
        self.permission_name = permission_name
        super().__init__()
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super admins have all permissions
        if hasattr(request.user, 'role') and (request.user.role == 'SUPER_ADMIN' or request.user.is_superuser):
            return True
        
        # Check if user has the specific permission
        if hasattr(request.user, 'has_permission'):
            return request.user.has_permission(self.permission_name)
        
        return False
    
    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)

