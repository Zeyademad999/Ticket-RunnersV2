"""
Custom exception classes for consistent error handling.
"""
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler
from django.conf import settings


def custom_exception_handler(exc, context):
    """
    Custom exception handler for consistent error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # If response is None, use default Django exception handling
    if response is not None:
        # Customize the response data structure
        if isinstance(exc, APIException):
            # If it's already our custom exception, use its detail
            if isinstance(exc.detail, dict) and 'error' in exc.detail:
                custom_response_data = exc.detail
            else:
                # Handle ValidationError with field-level errors
                if isinstance(exc.detail, dict):
                    # This is a field-level validation error (e.g., {'username': ['error']})
                    # Return it directly so frontend can access field errors easily
                    custom_response_data = exc.detail
                elif isinstance(exc.detail, list):
                    # List of errors
                    custom_response_data = {
                        'error': {
                            'code': exc.default_code.upper() if hasattr(exc, 'default_code') else 'ERROR',
                            'message': '; '.join([str(e) for e in exc.detail]),
                            'details': exc.detail
                        }
                    }
                else:
                    # Single error message
                    custom_response_data = {
                        'error': {
                            'code': exc.default_code.upper() if hasattr(exc, 'default_code') else 'ERROR',
                            'message': str(exc.detail),
                            'details': {}
                        }
                    }
            response.data = custom_response_data
    
    # Note: We don't handle non-DRF exceptions here to avoid circular issues
    # Let Django's default handler deal with them, or handle them in views
    
    return response


class ValidationError(APIException):
    """
    Custom validation error with consistent format.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid input data.'
    default_code = 'VALIDATION_ERROR'
    
    def __init__(self, detail=None, code=None, details=None):
        if detail is None:
            detail = self.default_detail
        if code is None:
            code = self.default_code
        
        self.detail = {
            'error': {
                'code': code,
                'message': detail,
                'details': details or {}
            }
        }


class AuthenticationError(APIException):
    """
    Custom authentication error.
    """
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Authentication credentials were not provided.'
    default_code = 'AUTHENTICATION_ERROR'
    
    def __init__(self, detail=None, code=None):
        if detail is None:
            detail = self.default_detail
        if code is None:
            code = self.default_code
        
        self.detail = {
            'error': {
                'code': code,
                'message': detail
            }
        }


class PermissionDenied(APIException):
    """
    Custom permission denied error.
    """
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action.'
    default_code = 'PERMISSION_DENIED'
    
    def __init__(self, detail=None, code=None):
        if detail is None:
            detail = self.default_detail
        if code is None:
            code = self.default_code
        
        self.detail = {
            'error': {
                'code': code,
                'message': detail
            }
        }


class NotFoundError(APIException):
    """
    Custom not found error.
    """
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Resource not found.'
    default_code = 'NOT_FOUND'
    
    def __init__(self, detail=None, code=None):
        if detail is None:
            detail = self.default_detail
        if code is None:
            code = self.default_code
        
        self.detail = {
            'error': {
                'code': code,
                'message': detail
            }
        }

