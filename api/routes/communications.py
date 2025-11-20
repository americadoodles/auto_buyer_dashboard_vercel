# Communication Logging API Routes
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from ..schemas.user import UserOut
from ..core.auth import get_current_user
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..services.event_bus import publish_communication_logged
import logging
import json

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

