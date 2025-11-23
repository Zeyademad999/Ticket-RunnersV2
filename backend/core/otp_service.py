"""
OTP service for generating, sending, and verifying OTP codes.
Uses Floki SMS API for sending SMS messages.
"""
import requests
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import random
import logging

from .models import OTP

logger = logging.getLogger(__name__)

# Floki SMS Configuration
FLOKI_SMS_URL = "https://flokisystems.com/flokisms/send-otp.php"
# Get token from settings, with fallback default (store in .env in production!)
FLOKI_SMS_TOKEN = getattr(settings, 'FLOKI_SMS_TOKEN', 'floki-secure-token-9f8e4c1f79284d99bdad6c74ea7ac2f1')


def generate_otp_code() -> str:
    """
    Generate a 6-digit OTP code.
    
    Returns:
        str: 6-digit OTP code
    """
    return str(random.randint(100000, 999999))


def send_email_otp(email: str, otp_code: str, app_name: str = "TicketRunners") -> bool:
    """
    Send OTP via email using Django's email backend.
    
    Args:
        email: Email address to send OTP to
        otp_code: The OTP code to send
        app_name: Application name (default: "TicketRunners")
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = f"{app_name} - Email Verification Code"
        message = f"""Hello,

Your email verification code is: {otp_code}

This code will expire in 5 minutes.

If you didn't request this code, please ignore this email.

Best regards,
{app_name} Team"""
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@ticketrunners.com')
        recipient_list = [email]
        
        logger.info(f"Sending email OTP to {email}")
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        logger.info(f"Email OTP sent successfully to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email OTP to {email}: {str(e)}", exc_info=True)
        return False


def send_sms_otp(phone: str, otp_code: str, app_name: str = "TicketRunners") -> dict:
    """
    Send OTP via Floki SMS API.
    
    Args:
        phone: Phone number to send OTP to
        otp_code: The OTP code to send
        app_name: Application name (default: "TicketRunners")
    
    Returns:
        dict: Response from SMS API with status and message
    """
    headers = {
        "Authorization": f"Bearer {FLOKI_SMS_TOKEN}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    payload = {
        "app_name": app_name,
        "otp_code": otp_code,
        "phone": phone,
    }
    
    try:
        logger.info(f"Sending OTP to {phone} via Floki SMS API")
        logger.debug(f"SMS payload: {payload}")
        response = requests.post(FLOKI_SMS_URL, headers=headers, data=payload, timeout=10)
        response.raise_for_status()
        
        # Try to parse JSON response
        try:
            result = response.json()
        except ValueError:
            # If response is not JSON, check if status code indicates success
            result = {
                "status": response.status_code == 200,
                "message": response.text[:200] if response.text else "Unknown response format"
            }
        
        logger.info(f"SMS API response for {phone}: {result}")
        
        # Handle different response formats
        # Check for common success indicators
        if isinstance(result, dict):
            # Check various possible success indicators
            status = result.get("status")
            if status is None:
                # Check for other common success fields
                if result.get("success") is True or result.get("sent") is True:
                    result["status"] = True
                elif response.status_code == 200:
                    # If HTTP status is 200, assume success even if status field is missing
                    result["status"] = True
                    logger.info(f"HTTP 200 response, assuming SMS sent successfully for {phone}")
                else:
                    result["status"] = False
            elif isinstance(status, bool):
                result["status"] = status
            elif isinstance(status, str):
                # Handle string status values
                result["status"] = status.lower() in ("true", "success", "sent", "1")
            elif isinstance(status, int):
                result["status"] = status == 1 or status == 200
        else:
            # Non-dict response, assume success if HTTP 200
            result = {
                "status": response.status_code == 200,
                "message": str(result)[:200]
            }
        
        return result
    except requests.RequestException as e:
        logger.error(f"Failed to send OTP to {phone}: {str(e)}", exc_info=True)
        return {
            "status": False,
            "message": f"Failed to send OTP: {str(e)}"
        }


def create_and_send_otp(phone_number: str, purpose: str, app_name: str = "TicketRunners") -> tuple[OTP, bool]:
    """
    Create OTP record and send SMS (or skip sending for email OTPs).
    
    Args:
        phone_number: Phone number or email address to send OTP to
        purpose: Purpose of OTP (login, forgot_password, email_verification, etc.)
        app_name: Application name for SMS
    
    Returns:
        tuple: (otp_instance, success) - OTP model instance and whether SMS was sent successfully
    """
    code = generate_otp_code()
    expires_at = timezone.now() + timedelta(minutes=5)
    
    # Invalidate any existing unused OTPs for the same phone and purpose
    OTP.objects.filter(
        phone_number=phone_number,
        purpose=purpose,
        used=False,
        expires_at__gt=timezone.now()
    ).update(used=True)
    
    # Create new OTP
    otp = OTP.objects.create(
        phone_number=phone_number,
        code=code,
        purpose=purpose,
        expires_at=expires_at
    )
    
    # For email verification, send email instead of SMS
    if purpose == 'email_verification':
        email_success = send_email_otp(phone_number, code, app_name)
        if not email_success:
            logger.warning(f"Email OTP created but email failed for {phone_number}")
        return otp, email_success
    
    # Send SMS for phone numbers
    sms_result = send_sms_otp(phone_number, code, app_name)
    success = sms_result.get("status", False)
    
    if not success:
        logger.warning(f"OTP created but SMS failed for {phone_number}: {sms_result.get('message', 'Unknown error')}")
    
    return otp, success


def verify_otp(phone_number: str, code: str, purpose: str) -> bool:
    """
    Verify OTP code against the most recent OTP sent.
    
    Args:
        phone_number: Phone number associated with OTP
        code: OTP code to verify (will be converted to string and stripped)
        purpose: Purpose of OTP
    
    Returns:
        bool: True if OTP is valid (matches the most recent unused OTP), False otherwise
    """
    # Normalize the code (convert to string, strip whitespace)
    code = str(code).strip() if code else ""
    
    # Get the most recent unused OTP for this phone number and purpose
    otp = OTP.objects.filter(
        phone_number=phone_number,
        purpose=purpose,
        used=False,
        expires_at__gt=timezone.now()
    ).order_by('-created_at').first()
    
    if otp:
        # Normalize stored code for comparison
        stored_code = str(otp.code).strip()
        
        # Verify the code matches the most recent OTP (case-insensitive comparison)
        if stored_code == code:
            otp.used = True
            otp.save(update_fields=['used'])
            logger.info(f"OTP verified successfully for {phone_number} (purpose: {purpose})")
            return True
        else:
            logger.warning(f"OTP verification failed for {phone_number}: code mismatch (expected: {stored_code}, received: {code}, types: {type(stored_code)} vs {type(code)})")
            return False
    
    # Check if there are any OTPs (used or expired) for debugging
    all_otps = OTP.objects.filter(
        phone_number=phone_number,
        purpose=purpose
    ).order_by('-created_at')[:3]
    
    if all_otps.exists():
        logger.warning(f"No valid unused OTP found for {phone_number} (purpose: {purpose}). Recent OTPs: {[(o.code, o.used, o.expires_at < timezone.now()) for o in all_otps]}")
    else:
        logger.warning(f"No OTPs found for {phone_number} (purpose: {purpose}). User needs to request a new OTP.")
    
    return False


def cleanup_expired_otps():
    """
    Cleanup expired OTPs (can be called periodically via cron job).
    """
    expired_count = OTP.objects.filter(expires_at__lt=timezone.now()).update(used=True)
    logger.info(f"Cleaned up {expired_count} expired OTPs")
    return expired_count
