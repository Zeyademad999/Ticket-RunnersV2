"""
Rate limiting middleware and utilities.
"""
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response
from functools import wraps


def rate_limit(key, limit, window):
    """
    Simple rate limiting decorator.
    
    Args:
        key: Cache key prefix
        limit: Maximum number of requests
        window: Time window in seconds
    """
    def decorator(func):
        def wrapper(request, *args, **kwargs):
            # Get client IP or user ID
            if request.user.is_authenticated:
                cache_key = f"{key}_{request.user.id}"
            else:
                from core.utils import get_client_ip
                cache_key = f"{key}_{get_client_ip(request)}"
            
            # Check current count
            current = cache.get(cache_key, 0)
            
            if current >= limit:
                return Response({
                    'error': {
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'message': f'Rate limit exceeded. Maximum {limit} requests per {window} seconds.'
                    }
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Increment count
            cache.set(cache_key, current + 1, window)
            
            return func(request, *args, **kwargs)
        
        return wrapper
    return decorator


def rate_limit_otp_request(limit=1, window=60):
    """
    Rate limiting decorator specifically for OTP requests.
    Uses phone_number from request data as the cache key.
    
    Args:
        limit: Maximum number of requests (default: 1)
        window: Time window in seconds (default: 60)
    
    Usage:
        @rate_limit_otp_request(limit=1, window=60)
        def send_otp(request):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            # Extract phone_number from request data
            phone_number = None
            
            # Handle both dict and string request.data
            if isinstance(request.data, str):
                import json
                try:
                    data = json.loads(request.data)
                    phone_number = data.get('mobile_number') or data.get('phone_number')
                except json.JSONDecodeError:
                    pass
            else:
                phone_number = request.data.get('mobile_number') or request.data.get('phone_number')
            
            # For email OTP, use email as identifier
            if not phone_number:
                if isinstance(request.data, str):
                    import json
                    try:
                        data = json.loads(request.data)
                        phone_number = data.get('email')
                    except json.JSONDecodeError:
                        pass
                else:
                    phone_number = request.data.get('email')
            
            if not phone_number:
                # If no phone_number/email found, fall back to IP-based rate limiting
                from core.utils import get_client_ip
                cache_key = f"otp_rate_limit_{get_client_ip(request)}"
            else:
                cache_key = f"otp_rate_limit_{phone_number}"
            
            # Check current count
            current = cache.get(cache_key, 0)
            
            if current >= limit:
                # Try to get remaining time, fallback to window if not available
                try:
                    remaining_time = cache.ttl(cache_key) or window
                except (AttributeError, TypeError):
                    remaining_time = window
                return Response({
                    'error': {
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'message': f'Please wait {remaining_time} seconds before requesting another OTP code.'
                    }
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            # Increment count
            cache.set(cache_key, current + 1, window)
            
            return func(request, *args, **kwargs)
        
        return wrapper
    return decorator

