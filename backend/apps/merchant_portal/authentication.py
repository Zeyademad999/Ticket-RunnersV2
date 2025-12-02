"""
Custom authentication for Merchant Portal.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from users.models import Merchant


class MerchantJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that sets merchant on request.
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
        
        # Get merchant_id from token
        merchant_id = validated_token.get('merchant_id')
        if not merchant_id:
            # No merchant_id in token, let other auth classes try
            return None
        
        try:
            merchant = Merchant.objects.get(id=merchant_id)
        except Merchant.DoesNotExist:
            raise InvalidToken('Merchant not found')
        
        # Set merchant on request
        request.merchant = merchant
        
        # Return a dummy user object with id attribute for compatibility
        # This allows IsAuthenticated permission to work
        class DummyUser:
            def __init__(self, merchant_id):
                self.id = merchant_id
                self.is_authenticated = True
        
        return (DummyUser(merchant_id), validated_token)

