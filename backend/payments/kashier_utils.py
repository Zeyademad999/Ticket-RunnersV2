"""
Kashier payment gateway utility functions.
"""
import hmac
import hashlib
from django.conf import settings


def generate_kashier_order_hash(order):
    """
    Generate Kashier order hash for payment initialization.
    
    Args:
        order: dict with keys:
            - mid: merchant ID
            - amount: amount as string (e.g., "299.00")
            - currency: currency code (e.g., "EGP")
            - merchantOrderId: order ID
            - secret: secret key
    
    Returns:
        str: Generated hash
    """
    mid = order['mid']
    amount = order['amount']
    currency = order['currency']
    order_id = order['merchantOrderId']
    secret = order['secret']
    
    # Use the exact path format from working example
    path = f"/?payment={mid}.{order_id}.{amount}.{currency}"
    
    # Generate HMAC SHA256 hash
    hash_value = hmac.new(
        secret.encode('utf-8'),
        path.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hash_value


def validate_kashier_signature(query, secret):
    """
    Validate Kashier payment signature from callback/webhook.
    
    Args:
        query: dict with payment callback parameters
        secret: secret key for validation
    
    Returns:
        bool: True if signature is valid, False otherwise
    """
    # Build query string in exact format from working example
    query_string = (
        "&paymentStatus=" + str(query.get("paymentStatus", "")) +
        "&cardDataToken=" + str(query.get("cardDataToken", "")) +
        "&maskedCard=" + str(query.get("maskedCard", "")) +
        "&merchantOrderId=" + str(query.get("merchantOrderId", "")) +
        "&orderId=" + str(query.get("orderId", "")) +
        "&cardBrand=" + str(query.get("cardBrand", "")) +
        "&orderReference=" + str(query.get("orderReference", "")) +
        "&transactionId=" + str(query.get("transactionId", "")) +
        "&amount=" + str(query.get("amount", "")) +
        "&currency=" + str(query.get("currency", ""))
    )
    
    # Remove leading '&' to get final URL
    final_url = query_string[1:] if query_string.startswith("&") else query_string
    
    # Generate signature
    signature = hmac.new(
        secret.encode('utf-8'),
        final_url.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # Compare signatures
    received_signature = query.get("signature", "")
    
    if signature == received_signature:
        return True
    else:
        return False

