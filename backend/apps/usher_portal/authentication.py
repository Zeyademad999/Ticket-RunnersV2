"""
Custom authentication for Usher Portal.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from users.models import Usher


class UsherJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that sets usher on request.
    """
    
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
        
        try:
            validated_token = self.get_validated_token(raw_token)
        except Exception:
            # Token validation failed, let other auth classes try
            return None
        
        # Get usher_id from token
        usher_id = validated_token.get('usher_id')
        if not usher_id:
            # No usher_id in token, let other auth classes try
            return None
        
        try:
            usher = Usher.objects.get(id=usher_id)
        except Usher.DoesNotExist:
            raise InvalidToken('Usher not found')
        
        # Set usher on request
        request.usher = usher
        
        # Return a dummy user object with id attribute for compatibility
        # This allows IsAuthenticated permission to work
        class DummyUser:
            def __init__(self, usher_id):
                self.id = usher_id
                self.is_authenticated = True
        
        return (DummyUser(usher_id), validated_token)

