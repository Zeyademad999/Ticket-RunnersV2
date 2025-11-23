"""
Notification service for sending SMS and email notifications about ticket assignments.
"""
import logging
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from .otp_service import send_sms_otp

logger = logging.getLogger(__name__)


def send_ticket_assignment_sms(ticket, purchaser_name, registration_token=None):
    """
    Send SMS notification when a ticket is purchased for someone.
    
    Args:
        ticket: Ticket instance
        purchaser_name: Name of the person who purchased the ticket
        registration_token: Optional TicketRegistrationToken if recipient is not registered
    
    Returns:
        dict: Response from SMS API with status and message
    """
    try:
        # Get phone number from assigned_mobile (the number entered when assigning ticket)
        phone_number = ticket.assigned_mobile
        if not phone_number:
            logger.warning(f"Cannot send SMS for ticket {ticket.id}: no assigned_mobile phone number")
            return {"status": False, "message": "No assigned phone number available"}
        
        # Log the phone number being used (for debugging)
        logger.info(f"Using assigned_mobile for SMS: {phone_number} (ticket {ticket.id})")
        
        event_name = ticket.event.title
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8083')
        
        # Determine the link based on whether user is registered
        if registration_token:
            # New user - send registration link
            link = f"{frontend_url}/signup?token={registration_token.token}"
            message = f"Someone purchased a ticket for you! Event: {event_name}. Register to claim: {link}"
        else:
            # Existing user - send link to My Tickets
            link = f"{frontend_url}/my-tickets"
            message = f"Someone purchased a ticket for you! Event: {event_name}. View it: {link}"
        
        # Use Floki SMS API for bulk text messages
        from .otp_service import FLOKI_SMS_TOKEN
        import requests
        
        # Use the bulk SMS endpoint
        sms_url = "https://flokisystems.com/flokisms/send-msg.php"
        
        headers = {
            "Authorization": f"Bearer {FLOKI_SMS_TOKEN}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        
        # Format message - keep it concise if needed
        text_message = message
        if len(text_message) > 160:
            # Truncate message if too long (SMS limit)
            text_message = text_message[:157] + "..."
        
        payload = {
            "text_message": text_message,
            "phone": phone_number,
        }
        
        try:
            logger.info(f"Sending ticket assignment SMS to {phone_number}: {text_message[:50]}...")
            response = requests.post(sms_url, headers=headers, data=payload, timeout=10)
            response.raise_for_status()
            
            try:
                result = response.json()
                logger.info(f"SMS API response for {phone_number}: {result}")
            except ValueError:
                # If response is not JSON, check status code
                result = {
                    "status": response.status_code == 200,
                    "message": response.text[:200] if response.text else "Unknown response format"
                }
                logger.info(f"SMS API non-JSON response for {phone_number}: {result}")
            
            # Check for success indicators
            status_success = False
            if isinstance(result, dict):
                status = result.get("status")
                if status is True or (isinstance(status, str) and status.lower() in ("true", "success", "sent", "1")):
                    status_success = True
                elif response.status_code == 200:
                    # If HTTP 200, assume success
                    status_success = True
            elif response.status_code == 200:
                status_success = True
            
            if status_success:
                logger.info(f"SMS sent successfully to {phone_number}")
                return {"status": True, "message": "SMS sent successfully"}
            else:
                logger.warning(f"SMS API returned unsuccessful status: {result}")
                return {"status": False, "message": f"SMS API error: {result.get('message', 'Unknown error')}"}
                
        except requests.RequestException as e:
            logger.error(f"Failed to send ticket assignment SMS to {phone_number}: {str(e)}", exc_info=True)
            return {"status": False, "message": f"Failed to send SMS: {str(e)}"}
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {phone_number}: {str(e)}", exc_info=True)
            return {"status": False, "message": f"Unexpected error: {str(e)}"}
                
    except Exception as e:
        logger.error(f"Error in send_ticket_assignment_sms: {str(e)}", exc_info=True)
        return {"status": False, "message": f"Error: {str(e)}"}


def send_ticket_assignment_email(ticket, purchaser_name, registration_token=None):
    """
    Send email notification when a ticket is purchased for someone.
    
    Args:
        ticket: Ticket instance
        purchaser_name: Name of the person who purchased the ticket
        registration_token: Optional TicketRegistrationToken if recipient is not registered
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        email = ticket.assigned_email or (ticket.customer.email if ticket.customer else None)
        if not email:
            logger.warning(f"Cannot send email for ticket {ticket.id}: no email address")
            return False
        
        event_name = ticket.event.title
        ticket_number = ticket.ticket_number
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8083')
        
        # Determine the link based on whether user is registered
        if registration_token:
            # New user - send registration link
            link = f"{frontend_url}/signup?token={registration_token.token}"
            claim_text = "Register to claim your ticket"
        else:
            # Existing user - send link to My Tickets
            link = f"{frontend_url}/my-tickets"
            claim_text = "View your ticket in My Tickets"
        
        subject = f"Ticket Purchased for You - {event_name}"
        
        message = f"""Hello,

{purchaser_name} has purchased a ticket for you!

Event: {event_name}
Ticket Number: {ticket_number}
Category: {ticket.category}
Price: {ticket.price}

{claim_text}: {link}

Thank you,
TicketRunners Team"""
        
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'blankksupp@gmail.com')
        
        logger.info(f"Sending ticket assignment email to {email}")
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"Ticket assignment email sent successfully to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send ticket assignment email: {str(e)}", exc_info=True)
        return False

