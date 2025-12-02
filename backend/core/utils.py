"""
Utility functions for the application.
"""
from django.utils import timezone
from django.core.cache import cache
from functools import wraps
import logging

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """
    Get the client IP address from the request.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def cache_result(timeout=300, key_prefix=''):
    """
    Decorator to cache function results.
    
    Args:
        timeout: Cache timeout in seconds (default: 5 minutes)
        key_prefix: Prefix for cache key
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{key_prefix}{func.__name__}_{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Call function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout)
            return result
        
        return wrapper
    return decorator


def log_system_action(user, action, category, severity='INFO', description='', ip_address='', status='SUCCESS'):
    """
    Log a system action to the SystemLog model.
    
    This function should be called after importing the SystemLog model to avoid circular imports.
    """
    from system.models import SystemLog
    
    try:
        SystemLog.objects.create(
            user=user if user.is_authenticated else None,
            user_role=user.role if user.is_authenticated and hasattr(user, 'role') else None,
            action=action,
            category=category,
            severity=severity,
            description=description,
            ip_address=ip_address,
            status=status,
            timestamp=timezone.now()
        )
    except Exception as e:
        logger.error(f"Failed to log system action: {e}")

