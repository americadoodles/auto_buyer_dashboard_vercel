# Communication Logging API Routes
from fastapi import APIRouter, HTTPException, Depends, Query, Request, Response
from fastapi.responses import PlainTextResponse
from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field
from ..schemas.user import UserOut
from ..core.auth import get_current_user
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..services.event_bus import publish_communication_logged
from ..services.twilio_service import twilio_service
from ..repositories.crm_contacts import get_contact
from ..core.config import settings
import logging
import json
import urllib.parse

logger = logging.getLogger(__name__)

communication_router = APIRouter(prefix="/crm/communications", tags=["crm-communications"])


class CommunicationCreate(BaseModel):
    from_user_id: Optional[UUID] = None
    to_contact_id: Optional[UUID] = None
    to_lead_id: Optional[UUID] = None
    communication_type: str  # 'email', 'call', 'sms', 'meeting'
    subject: Optional[str] = None
    content: Optional[str] = None
    direction: str  # 'inbound', 'outbound'
    status: str = "sent"  # 'sent', 'delivered', 'read', 'failed'
    template_id: Optional[UUID] = None


@communication_router.post("/", response_model=dict)
def create_communication(
    communication: CommunicationCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new communication log entry and emit CommunicationLogged event"""
    if not DB_ENABLED:
        raise HTTPException(status_code=500, detail="Database not enabled")
    
    with get_db_connection() as conn:
        if not conn:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        try:
            with conn.cursor() as cur:
                # Use current user as from_user_id if not provided
                from_user_id = communication.from_user_id or current_user.id
                
                cur.execute("""
                    INSERT INTO communications (
                        from_user_id, to_contact_id, to_lead_id, communication_type,
                        subject, content, direction, status, template_id, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id, created_at
                """, (
                    from_user_id,
                    communication.to_contact_id,
                    communication.to_lead_id,
                    communication.communication_type,
                    communication.subject,
                    communication.content,
                    communication.direction,
                    communication.status,
                    communication.template_id,
                    datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    communication_id, created_at = result
                    
                    # Emit CommunicationLogged event
                    try:
                        publish_communication_logged(
                            communication_id=communication_id,
                            from_user_id=from_user_id,
                            to_contact_id=communication.to_contact_id,
                            to_lead_id=communication.to_lead_id,
                            communication_type=communication.communication_type,
                            direction=communication.direction
                        )
                    except Exception as event_error:
                        logger.warning(f"Failed to emit CommunicationLogged event: {str(event_error)}")
                    
                    return {
                        "id": communication_id,
                        "created_at": created_at.isoformat(),
                        "message": "Communication logged successfully"
                    }
                else:
                    raise HTTPException(status_code=500, detail="Failed to create communication")
                    
        except Exception as e:
            logger.error(f"Error creating communication: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create communication")


# ==============================================
# CALL MANAGEMENT ENDPOINTS
# ==============================================

class CallRequest(BaseModel):
    contact_id: UUID
    phone_number: Optional[str] = None  # If not provided, will use contact's phone
    twiml: Optional[str] = Field(None, description="TwiML instructions for the call")
    url: Optional[str] = Field(None, description="URL to fetch TwiML instructions from")


@communication_router.post("/calls", response_model=dict)
def initiate_call(
    call_request: CallRequest,
    current_user: UserOut = Depends(get_current_user)
):
    """Initiate a phone call to a contact"""
    try:
        # Get contact information
        contact = get_contact(call_request.contact_id)
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        # Determine phone number to call
        phone_number = call_request.phone_number
        if not phone_number:
            # Try mobile first, then phone
            phone_number = contact.mobile or contact.phone
        
        if not phone_number:
            raise HTTPException(
                status_code=400,
                detail="No phone number available for this contact. Please provide a phone number."
            )
        
        # Use provided TwiML or URL, or let the service use default keep-alive TwiML
        twiml = call_request.twiml
        url = call_request.url
        
        # Make the call
        # If no TwiML/URL provided, the service will use a default keep-alive TwiML
        result = twilio_service.make_call(
            to_phone=phone_number,
            twiml=twiml if twiml else None,
            url=url if url else None
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to initiate call")
            )
        
        # Log the communication
        if DB_ENABLED:
            try:
                with get_db_connection() as conn:
                    if conn:
                        with conn.cursor() as cur:
                            cur.execute("""
                                INSERT INTO communications (
                                    from_user_id, to_contact_id, communication_type,
                                    subject, content, direction, status, created_at
                                ) VALUES (
                                    %s, %s, %s, %s, %s, %s, %s, %s
                                ) RETURNING id
                            """, (
                                current_user.id,
                                call_request.contact_id,
                                'call',
                                f"Call to {contact_name}",
                                f"Call initiated via Twilio. Call SID: {result.get('call_sid')}",
                                'outbound',
                                result.get('status', 'initiated'),
                                datetime.now()
                            ))
                            communication_id = cur.fetchone()[0]
                            conn.commit()
                            
                            # Emit event
                            try:
                                publish_communication_logged(
                                    communication_id=communication_id,
                                    from_user_id=current_user.id,
                                    to_contact_id=call_request.contact_id,
                                    communication_type='call',
                                    direction='outbound'
                                )
                            except Exception as event_error:
                                logger.warning(f"Failed to emit CommunicationLogged event: {str(event_error)}")
            except Exception as log_error:
                logger.warning(f"Failed to log communication: {str(log_error)}")
        
        return {
            "success": True,
            "call_sid": result.get("call_sid"),
            "status": result.get("status"),
            "message": "Call initiated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating call: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to initiate call: {str(e)}")


@communication_router.get("/calls/{call_sid}/status", response_model=dict)
def get_call_status(
    call_sid: str,
    current_user: UserOut = Depends(get_current_user)
):
    """Get the status of a call"""
    try:
        result = twilio_service.get_call_status(call_sid)
        if not result.get("success"):
            raise HTTPException(
                status_code=404,
                detail=result.get("error", "Call not found")
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching call status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch call status")


@communication_router.post("/calls/{call_sid}/stop", response_model=dict)
def stop_call(
    call_sid: str,
    current_user: UserOut = Depends(get_current_user)
):
    """Stop/end an active call"""
    try:
        result = twilio_service.stop_call(call_sid)
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to stop call")
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping call: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to stop call: {str(e)}")


# ==============================================
# BROWSER VOICE ENDPOINTS (WebRTC)
# ==============================================

@communication_router.get("/voice/token", response_model=dict)
def get_voice_token(
    current_user: UserOut = Depends(get_current_user)
):
    """
    Generate an Access Token for browser-based voice calling.
    This token allows the browser to connect to Twilio via WebRTC.
    """
    try:
        # Use user ID as identity for the voice client
        identity = f"user_{current_user.id}"
        result = twilio_service.generate_voice_token(identity)
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to generate voice token")
            )
        
        return {
            "success": True,
            "token": result.get("token"),
            "identity": result.get("identity")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating voice token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate voice token: {str(e)}")


@communication_router.post("/voice/outbound", response_class=PlainTextResponse)
async def voice_outbound_handler(request: Request):
    """
    TwiML webhook for outbound voice calls from browser.
    This endpoint is called by Twilio when a browser client initiates a call.
    Returns TwiML that connects the browser to the destination phone number.
    
    Note: This endpoint doesn't require authentication as it's called by Twilio.
    Twilio validates requests via signature (can be implemented for production).
    """
    try:
        # Get form data from Twilio's POST request
        form_data = await request.form()
        
        # Extract the 'To' parameter (the phone number to call)
        to_number = form_data.get("To", "")
        from_number = form_data.get("From", "")
        caller = form_data.get("Caller", "")
        
        logger.info(f"Voice outbound request - To: {to_number}, From: {from_number}, Caller: {caller}")
        
        if not to_number:
            # If no number specified, return error TwiML
            twiml = '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>No phone number was provided. Please try again.</Say>
</Response>'''
            return PlainTextResponse(content=twiml, media_type="application/xml")
        
        # Clean the phone number (remove any client: prefix if present)
        if to_number.startswith("client:"):
            # This is a client-to-client call, not supported yet
            twiml = '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Client to client calls are not supported.</Say>
</Response>'''
            return PlainTextResponse(content=twiml, media_type="application/xml")
        
        # Get the caller ID from settings
        caller_id = settings.TWILIO_PHONE_NUMBER
        
        # Generate TwiML to connect browser to phone
        # The <Dial> verb bridges the browser's audio to the phone call
        twiml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="{caller_id}">
        <Number>{to_number}</Number>
    </Dial>
</Response>'''
        
        logger.info(f"Returning TwiML for call to {to_number}")
        return PlainTextResponse(content=twiml, media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error in voice outbound handler: {str(e)}")
        # Return error TwiML
        twiml = '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>An error occurred. Please try again later.</Say>
</Response>'''
        return PlainTextResponse(content=twiml, media_type="application/xml")


# ==============================================
# SMS MANAGEMENT ENDPOINTS
# ==============================================

class SMSRequest(BaseModel):
    contact_id: UUID
    message: str = Field(..., min_length=1, max_length=1600, description="SMS message content")
    phone_number: Optional[str] = None  # If not provided, will use contact's mobile or phone


@communication_router.post("/sms", response_model=dict)
def send_sms(
    sms_request: SMSRequest,
    current_user: UserOut = Depends(get_current_user)
):
    """Send an SMS message to a contact"""
    try:
        # Get contact information
        contact = get_contact(sms_request.contact_id)
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        # Determine phone number to send to
        phone_number = sms_request.phone_number
        if not phone_number:
            # Try mobile first, then phone
            phone_number = contact.mobile or contact.phone
        
        if not phone_number:
            raise HTTPException(
                status_code=400,
                detail="No phone number available for this contact. Please provide a phone number."
            )
        
        # Send the SMS
        result = twilio_service.send_sms(
            to_phone=phone_number,
            message=sms_request.message
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Failed to send SMS")
            )
        
        # Log the communication
        contact_name = f"{contact.first_name} {contact.last_name}".strip()
        if DB_ENABLED:
            try:
                with get_db_connection() as conn:
                    if conn:
                        with conn.cursor() as cur:
                            cur.execute("""
                                INSERT INTO communications (
                                    from_user_id, to_contact_id, communication_type,
                                    subject, content, direction, status, created_at
                                ) VALUES (
                                    %s, %s, %s, %s, %s, %s, %s, %s
                                ) RETURNING id
                            """, (
                                current_user.id,
                                sms_request.contact_id,
                                'sms',
                                f"SMS to {contact_name}",
                                sms_request.message,
                                'outbound',
                                result.get('status', 'sent'),
                                datetime.now()
                            ))
                            communication_id = cur.fetchone()[0]
                            conn.commit()
                            
                            # Emit event
                            try:
                                publish_communication_logged(
                                    communication_id=communication_id,
                                    from_user_id=current_user.id,
                                    to_contact_id=sms_request.contact_id,
                                    communication_type='sms',
                                    direction='outbound'
                                )
                            except Exception as event_error:
                                logger.warning(f"Failed to emit CommunicationLogged event: {str(event_error)}")
            except Exception as log_error:
                logger.warning(f"Failed to log communication: {str(log_error)}")
        
        return {
            "success": True,
            "message_sid": result.get("message_sid"),
            "status": result.get("status"),
            "message": "SMS sent successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending SMS: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")

