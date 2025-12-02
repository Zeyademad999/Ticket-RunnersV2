"""
Custom authentication for Organizer Portal.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from users.models import Organizer


class DummyUser:
    """Dummy user object for compatibility with IsAuthenticated permission."""
    def __init__(self, organizer_id):
        self.id = organizer_id
        self.is_authenticated = True
        self.is_active = True
        self.is_staff = False
        self.is_superuser = False


class OrganizerJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that sets organizer on request.
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
        except InvalidToken:
            return None
        
        # Get organizer_id from token
        organizer_id = validated_token.get('organizer_id')
        if not organizer_id:
            # Token doesn't have organizer_id, let other auth classes try
            return None
        
        try:
            organizer = Organizer.objects.get(id=organizer_id)
        except Organizer.DoesNotExist:
            raise InvalidToken('Organizer not found')
        
        # Set organizer on request
        request.organizer = organizer
        
        # Return a dummy user object for IsAuthenticated compatibility
        return (DummyUser(organizer_id), validated_token)

