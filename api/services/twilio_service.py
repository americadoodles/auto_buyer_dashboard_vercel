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
        self.enabled = False
        self.client = None
        self.error_message = None
        
        # Check if Twilio SDK is available
        if not TWILIO_AVAILABLE:
            self.error_message = "Twilio SDK not installed. Install with: pip install twilio"
            logger.warning(self.error_message)
            return
        
        # Check if Twilio is enabled in settings
        if not settings.TWILIO_ENABLED:
            self.error_message = "Twilio is not enabled. Set TWILIO_ENABLED=true in your environment variables."
            logger.warning(self.error_message)
            return
        
        # Check if credentials are configured
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            self.error_message = "Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your environment variables."
            logger.warning(self.error_message)
            return
        
        # Check if phone number is configured
        if not settings.TWILIO_PHONE_NUMBER:
            self.error_message = "Twilio phone number not configured. Please set TWILIO_PHONE_NUMBER in your environment variables."
            logger.warning(self.error_message)
            return
        
        # Try to initialize the client
        try:
            self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            self.enabled = True
            logger.info("Twilio client initialized successfully")
        except Exception as e:
            self.error_message = f"Failed to initialize Twilio client: {str(e)}"
            logger.error(self.error_message)
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
                "error": self.error_message or "Twilio service not enabled or not configured"
            }
        
        try:
            from_phone = from_phone or settings.TWILIO_PHONE_NUMBER
            
            if twiml:
                call = self.client.calls.create(
                    to=to_phone,
                    from_=from_phone,
                    twiml=twiml
                )
            elif url:
                call = self.client.calls.create(
                    to=to_phone,
                    from_=from_phone,
                    url=url
                )
            else:
                # For outbound calls without TwiML, use <Gather> with a very long timeout
                # This keeps the call open waiting for input (which never comes)
                # The call will stay open until either party hangs up
                # timeout="3600" = 1 hour, numDigits="0" = don't wait for digits
                # Without an action URL, Gather will keep the call open indefinitely
                keep_alive_twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Gather timeout="3600" numDigits="0"></Gather></Response>'
                call = self.client.calls.create(
                    to=to_phone,
                    from_=from_phone,
                    twiml=keep_alive_twiml
                )
            
            # Safely get the 'from' attribute (it's 'from_' in the SDK)
            call_from = getattr(call, 'from_', from_phone)
            
            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status,
                "to": call.to,
                "from": call_from,
                "direction": getattr(call, 'direction', None)
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
                "error": self.error_message or "Twilio service not enabled or not configured"
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
            
            # Safely get the 'from' attribute (it's 'from_' in the SDK)
            message_from = getattr(message_obj, 'from_', from_phone)
            
            return {
                "success": True,
                "message_sid": message_obj.sid,
                "status": message_obj.status,
                "to": getattr(message_obj, 'to', to_phone),
                "from": message_from,
                "date_sent": message_obj.date_sent.isoformat() if hasattr(message_obj, 'date_sent') and message_obj.date_sent else None
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
                "error": self.error_message or "Twilio service not enabled or not configured"
            }
        
        try:
            call = self.client.calls(call_sid).fetch()
            # Safely get the 'from' attribute (it's 'from_' in the SDK)
            call_from = getattr(call, 'from_', None)
            
            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status,
                "duration": getattr(call, 'duration', None),
                "to": getattr(call, 'to', None),
                "from": call_from,
                "start_time": call.start_time.isoformat() if hasattr(call, 'start_time') and call.start_time else None,
                "end_time": call.end_time.isoformat() if hasattr(call, 'end_time') and call.end_time else None
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
    
    def stop_call(self, call_sid: str) -> Dict[str, Any]:
        """Stop/end an active call"""
        if not self.enabled or not self.client:
            return {
                "success": False,
                "error": self.error_message or "Twilio service not enabled or not configured"
            }
        
        try:
            call = self.client.calls(call_sid).update(status='completed')
            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status,
                "message": "Call ended successfully"
            }
        except TwilioRestException as e:
            logger.error(f"Twilio API error: {str(e)}")
            return {
                "success": False,
                "error": f"Twilio API error: {e.msg}",
                "code": e.code
            }
        except Exception as e:
            logger.error(f"Error stopping call: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to stop call: {str(e)}"
            }


# Singleton instance
twilio_service = TwilioService()
