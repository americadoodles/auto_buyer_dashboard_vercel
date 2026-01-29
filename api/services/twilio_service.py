# Twilio Service for Calls and SMS
import logging
from typing import Optional, Dict, Any
from ..core.config import settings

logger = logging.getLogger(__name__)

try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    from twilio.jwt.access_token import AccessToken
    from twilio.jwt.access_token.grants import VoiceGrant
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
        from_phone: Optional[str] = None,
        use_messaging_service: bool = True
    ) -> Dict[str, Any]:
        """
        Send an SMS message using Twilio with A2P 10DLC compliance support.
        
        Uses Messaging Service SID when available for better deliverability
        and to avoid spam filters. Messaging Service should be linked to your
        registered 10DLC campaign in Twilio Console.
        
        Args:
            to_phone: Phone number to send to (E.164 format)
            message: Message content
            from_phone: Phone number to send from (defaults to TWILIO_PHONE_NUMBER)
            use_messaging_service: If True, will use Messaging Service SID when available
        
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
            messaging_service_sid = settings.TWILIO_MESSAGING_SERVICE_SID
            from_phone = from_phone or settings.TWILIO_PHONE_NUMBER
            
            # Use Messaging Service SID for A2P 10DLC compliance when available
            # This provides better deliverability and avoids spam filters
            if use_messaging_service and messaging_service_sid:
                logger.info(f"Sending SMS via Messaging Service: {messaging_service_sid[:8]}...")
                message_obj = self.client.messages.create(
                    body=message,
                    to=to_phone,
                    messaging_service_sid=messaging_service_sid
                )
                message_from = messaging_service_sid
            else:
                # Fallback to direct phone number (may be filtered for A2P)
                if not from_phone:
                    return {
                        "success": False,
                        "error": "No phone number or Messaging Service configured. "
                                 "For A2P SMS, configure TWILIO_MESSAGING_SERVICE_SID."
                    }
                logger.info(f"Sending SMS from phone number: {from_phone}")
                logger.warning(
                    "Sending SMS without Messaging Service. For better deliverability "
                    "and A2P 10DLC compliance, configure TWILIO_MESSAGING_SERVICE_SID."
                )
                message_obj = self.client.messages.create(
                    body=message,
                    to=to_phone,
                    from_=from_phone
                )
                message_from = getattr(message_obj, 'from_', from_phone)
            
            return {
                "success": True,
                "message_sid": message_obj.sid,
                "status": message_obj.status,
                "to": getattr(message_obj, 'to', to_phone),
                "from": message_from,
                "date_sent": message_obj.date_sent.isoformat() if hasattr(message_obj, 'date_sent') and message_obj.date_sent else None,
                "used_messaging_service": bool(use_messaging_service and messaging_service_sid)
            }
        except TwilioRestException as e:
            logger.error(f"Twilio API error: {str(e)}")
            error_msg = f"Twilio API error: {e.msg}"
            # Add helpful hints for common A2P errors
            if e.code == 21610:
                error_msg += " (Recipient has opted out of messages)"
            elif e.code == 21408:
                error_msg += " (Permission denied - check A2P 10DLC registration)"
            elif e.code == 21211:
                error_msg += " (Invalid 'To' phone number)"
            elif e.code == 21614:
                error_msg += " (Phone number not SMS-capable)"
            elif e.code == 30003:
                error_msg += " (Unreachable - carrier issue or invalid number)"
            elif e.code == 30004:
                error_msg += " (Message blocked - likely spam filter. Use Messaging Service with 10DLC)"
            elif e.code == 30005:
                error_msg += " (Unknown destination - number may not exist)"
            elif e.code == 30006:
                error_msg += " (Landline or unreachable carrier)"
            elif e.code == 30007:
                error_msg += " (Carrier filtering - register 10DLC campaign)"
            return {
                "success": False,
                "error": error_msg,
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
    
    def generate_voice_token(self, identity: str) -> Dict[str, Any]:
        """
        Generate an Access Token for browser-based voice calling.
        This token allows the browser to connect to Twilio for voice transmission.
        
        Args:
            identity: Unique identifier for the user (e.g., user ID or email)
        
        Returns:
            Dict with token or error
        """
        if not TWILIO_AVAILABLE:
            return {
                "success": False,
                "error": "Twilio SDK not installed"
            }
        
        if not settings.TWILIO_ENABLED:
            return {
                "success": False,
                "error": "Twilio is not enabled"
            }
        
        # Check for API key credentials (preferred for Access Tokens)
        api_key = settings.TWILIO_API_KEY
        api_secret = settings.TWILIO_API_SECRET
        account_sid = settings.TWILIO_ACCOUNT_SID
        twiml_app_sid = settings.TWILIO_TWIML_APP_SID
        
        if not account_sid:
            return {
                "success": False,
                "error": "TWILIO_ACCOUNT_SID not configured"
            }
        
        # If no API key, we can still use the auth token for testing
        if not api_key or not api_secret:
            # Fallback: use account SID and auth token (not recommended for production)
            api_key = account_sid
            api_secret = settings.TWILIO_AUTH_TOKEN
            if not api_secret:
                return {
                    "success": False,
                    "error": "TWILIO_API_KEY and TWILIO_API_SECRET or TWILIO_AUTH_TOKEN not configured"
                }
            logger.warning("Using TWILIO_AUTH_TOKEN for Access Token generation. "
                          "For production, use TWILIO_API_KEY and TWILIO_API_SECRET.")
        
        try:
            # Create Access Token
            token = AccessToken(
                account_sid,
                api_key,
                api_secret,
                identity=identity,
                ttl=3600  # Token valid for 1 hour
            )
            
            # Create Voice Grant
            voice_grant = VoiceGrant(
                outgoing_application_sid=twiml_app_sid if twiml_app_sid else None,
                incoming_allow=True  # Allow incoming calls to this identity
            )
            
            # Add grant to token
            token.add_grant(voice_grant)
            
            return {
                "success": True,
                "token": token.to_jwt(),
                "identity": identity
            }
        except Exception as e:
            logger.error(f"Error generating voice token: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to generate voice token: {str(e)}"
            }
    
    def make_browser_call(
        self,
        to_phone: str,
        from_phone: Optional[str] = None,
        caller_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Make a call from browser to phone.
        Returns TwiML that connects the browser client to the phone number.
        
        Args:
            to_phone: Phone number to call (E.164 format)
            from_phone: Caller ID to display (defaults to TWILIO_PHONE_NUMBER)
            caller_id: Browser client identity (for logging)
        
        Returns:
            Dict with TwiML or error
        """
        if not self.enabled:
            return {
                "success": False,
                "error": self.error_message or "Twilio service not enabled"
            }
        
        from_phone = from_phone or settings.TWILIO_PHONE_NUMBER
        
        if not from_phone:
            return {
                "success": False,
                "error": "No caller ID (from phone number) configured"
            }
        
        # Generate TwiML for browser-to-phone call with optimized settings
        # The <Dial> verb connects the browser to the phone number
        # answerOnBridge="true" - Rings in browser until remote party answers (better UX)
        # timeout="30" - Ring for 30 seconds before giving up
        twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="{from_phone}" answerOnBridge="true" timeout="30">
        <Number>{to_phone}</Number>
    </Dial>
</Response>'''
        
        return {
            "success": True,
            "twiml": twiml,
            "to": to_phone,
            "from": from_phone
        }


# Singleton instance
twilio_service = TwilioService()
