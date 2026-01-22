# Twilio Service for Calls and SMS
import logging
from typing import Optional, Dict, Any
from ..core.config import settings

logger = logging.getLogger(__name__)

try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    logger.warning("Twilio SDK not installed. Install with: pip install twilio")


class TwilioService:
    """Service for handling Twilio calls and SMS"""
    
    def __init__(self):
        self.enabled = settings.TWILIO_ENABLED and TWILIO_AVAILABLE
        self.client = None
        
        if self.enabled:
            if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
                logger.warning("Twilio enabled but credentials not configured")
                self.enabled = False
            else:
                try:
                    self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                    logger.info("Twilio client initialized successfully")
                except Exception as e:
                    logger.error(f"Failed to initialize Twilio client: {str(e)}")
                    self.enabled = False
    
    def make_call(
        self,
        to_phone: str,
        from_phone: Optional[str] = None,
        url: Optional[str] = None,
        twiml: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Make a phone call using Twilio
        
        Args:
            to_phone: Phone number to call (E.164 format)
            from_phone: Phone number to call from (defaults to TWILIO_PHONE_NUMBER)
            url: URL to fetch TwiML instructions from
            twiml: TwiML instructions as string
        
        Returns:
            Dict with call information or error
        """
        if not self.enabled or not self.client:
            return {
                "success": False,
                "error": "Twilio service not enabled or not configured"
            }
        
        if not url and not twiml:
            return {
                "success": False,
                "error": "Either url or twiml must be provided"
            }
        
        try:
            from_phone = from_phone or settings.TWILIO_PHONE_NUMBER
            
            if twiml:
                call = self.client.calls.create(
                    to=to_phone,
                    from_=from_phone,
                    twiml=twiml
                )
            else:
                call = self.client.calls.create(
                    to=to_phone,
                    from_=from_phone,
                    url=url
                )
            
            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status,
                "to": call.to,
                "from": call.from_,
                "direction": call.direction
            }
        except TwilioRestException as e:
            logger.error(f"Twilio API error: {str(e)}")
            return {
                "success": False,
                "error": f"Twilio API error: {e.msg}",
                "code": e.code
            }
        except Exception as e:
            logger.error(f"Error making call: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to make call: {str(e)}"
            }
    
    def send_sms(
        self,
        to_phone: str,
        message: str,
        from_phone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send an SMS message using Twilio
        
        Args:
            to_phone: Phone number to send to (E.164 format)
            message: Message content
            from_phone: Phone number to send from (defaults to TWILIO_PHONE_NUMBER)
        
        Returns:
            Dict with message information or error
        """
        if not self.enabled or not self.client:
            return {
                "success": False,
                "error": "Twilio service not enabled or not configured"
            }
        
        if not message or not message.strip():
            return {
                "success": False,
                "error": "Message cannot be empty"
            }
        
        try:
            from_phone = from_phone or settings.TWILIO_PHONE_NUMBER
            
            message_obj = self.client.messages.create(
                body=message,
                to=to_phone,
                from_=from_phone
            )
            
            return {
                "success": True,
                "message_sid": message_obj.sid,
                "status": message_obj.status,
                "to": message_obj.to,
                "from": message_obj.from_,
                "date_sent": message_obj.date_sent.isoformat() if message_obj.date_sent else None
            }
        except TwilioRestException as e:
            logger.error(f"Twilio API error: {str(e)}")
            return {
                "success": False,
                "error": f"Twilio API error: {e.msg}",
                "code": e.code
            }
        except Exception as e:
            logger.error(f"Error sending SMS: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to send SMS: {str(e)}"
            }
    
    def get_call_status(self, call_sid: str) -> Dict[str, Any]:
        """Get the status of a call"""
        if not self.enabled or not self.client:
            return {
                "success": False,
                "error": "Twilio service not enabled or not configured"
            }
        
        try:
            call = self.client.calls(call_sid).fetch()
            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status,
                "duration": call.duration,
                "to": call.to,
                "from": call.from_,
                "start_time": call.start_time.isoformat() if call.start_time else None,
                "end_time": call.end_time.isoformat() if call.end_time else None
            }
        except TwilioRestException as e:
            logger.error(f"Twilio API error: {str(e)}")
            return {
                "success": False,
                "error": f"Twilio API error: {e.msg}",
                "code": e.code
            }
        except Exception as e:
            logger.error(f"Error fetching call status: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to fetch call status: {str(e)}"
            }


# Singleton instance
twilio_service = TwilioService()
