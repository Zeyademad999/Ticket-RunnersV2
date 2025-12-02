"""
Custom authentication for Customer Portal (WebApp).
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from customers.models import Customer


class DummyUser:
    """Dummy user object for compatibility with IsAuthenticated permission."""
    def __init__(self, customer_id):
        self.id = customer_id
        self.is_active = True
        self.is_staff = False
        self.is_superuser = False
    
    @property
    def is_authenticated(self):
        return True


class CustomerJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that sets customer on request.
    """
    
    def authenticate(self, request):
        import logging
        logger = logging.getLogger(__name__)
        
        header = self.get_header(request)
        if header is None:
            logger.info("CustomerJWTAuthentication: No authorization header")
            return None
        
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            logger.info("CustomerJWTAuthentication: No raw token found")
            return None
        
        try:
            validated_token = self.get_validated_token(raw_token)
            logger.info(f"CustomerJWTAuthentication: Token validated successfully")
        except Exception as e:
            # Token validation failed, let other auth classes try
            logger.warning(f"CustomerJWTAuthentication: Token validation failed: {str(e)}")
            return None
        
        # Get customer_id from token
        customer_id = validated_token.get('customer_id')
        logger.info(f"CustomerJWTAuthentication: customer_id from token: {customer_id}")
        
        # Fallback: try to get customer_id from user_id claim if not present
        if not customer_id:
            user_id = validated_token.get('user_id')
            logger.info(f"CustomerJWTAuthentication: No customer_id in token, trying user_id: {user_id}")
            if user_id:
                # Try to use user_id as customer_id (for backward compatibility with old tokens)
                customer_id = str(user_id)
                logger.info(f"CustomerJWTAuthentication: Using user_id as customer_id: {customer_id}")
            else:
                # No customer_id in token and no user_id, let other auth classes try
                logger.warning("CustomerJWTAuthentication: No customer_id or user_id in token - token claims: " + str(list(validated_token.keys())))
                return None
        
        # Now try to get the customer
        try:
            customer = Customer.objects.get(id=customer_id)
            logger.debug(f"CustomerJWTAuthentication: Customer found: {customer.id}")
        except Customer.DoesNotExist:
            # Customer not found - this might be an admin token, let other auth classes try
            logger.warning(f"CustomerJWTAuthentication: Customer not found with id: {customer_id}, letting other auth classes try")
            return None
        
        # Set customer on request
        request.customer = customer
        
        # Create dummy user object
        dummy_user = DummyUser(customer_id)
        
        # Log authentication details
        logger.info(f"CustomerJWTAuthentication: Setting request.customer = {customer.id}, request.user will be DummyUser({customer_id}), is_authenticated = {dummy_user.is_authenticated}")
        
        # Return a dummy user object for IsAuthenticated compatibility
        logger.debug(f"CustomerJWTAuthentication: Authentication successful for customer {customer_id}")
        return (dummy_user, validated_token)

