# Event Outbox Repository
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import json
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.events import EventType, EventStatus, EventOut

logger = logging.getLogger(__name__)


def create_outbox_event(
    event_type: EventType,
    payload: dict,
    metadata: Optional[dict] = None
) -> Optional[UUID]:
    """Create an event in the outbox table"""
    if not DB_ENABLED:
        logger.warning("Database not enabled, skipping outbox event creation")
        return None
    
    with get_db_connection() as conn:
        if not conn:
            logger.error("Database connection failed")
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO event_outbox (event_type, payload, metadata, status, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    event_type.value,
                    json.dumps(payload),
                    json.dumps(metadata) if metadata else None,
                    EventStatus.PENDING.value,
                    datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    return result[0]
                return None
                
        except Exception as e:
            logger.error(f"Error creating outbox event: {str(e)}")
            return None


def get_pending_events(limit: int = 100) -> List[EventOut]:
    """Get pending events from outbox"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, event_type, payload, status, metadata, 
                           created_at, processed_at, retry_count, error_message
                    FROM event_outbox
                    WHERE status = %s
                    ORDER BY created_at ASC
                    LIMIT %s
                """, (EventStatus.PENDING.value, limit))
                
                results = cur.fetchall()
                events = []
                
                for result in results:
                    payload = json.loads(result[2]) if result[2] else {}
                    metadata = json.loads(result[4]) if result[4] else None
                    
                    events.append(EventOut(
                        id=result[0],
                        event_type=EventType(result[1]),
                        payload=payload,
                        status=EventStatus(result[3]),
                        metadata=metadata,
                        created_at=result[5],
                        processed_at=result[6],
                        retry_count=result[7] or 0,
                        error_message=result[8]
                    ))
                
                return events
                
        except Exception as e:
            logger.error(f"Error fetching pending events: {str(e)}")
            return []


def mark_event_processing(event_id: UUID) -> bool:
    """Mark an event as processing"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE event_outbox
                    SET status = %s, processed_at = %s
                    WHERE id = %s AND status = %s
                """, (EventStatus.PROCESSING.value, datetime.now(), event_id, EventStatus.PENDING.value))
                
                return cur.rowcount > 0
                
        except Exception as e:
            logger.error(f"Error marking event as processing: {str(e)}")
            return False


def mark_event_completed(event_id: UUID) -> bool:
    """Mark an event as completed"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE event_outbox
                    SET status = %s, processed_at = %s, error_message = NULL
                    WHERE id = %s
                """, (EventStatus.COMPLETED.value, datetime.now(), event_id))
                
                return cur.rowcount > 0
                
        except Exception as e:
            logger.error(f"Error marking event as completed: {str(e)}")
            return False


def mark_event_failed(event_id: UUID, error_message: str, retry_count: Optional[int] = None) -> bool:
    """Mark an event as failed"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                if retry_count is not None:
                    cur.execute("""
                        UPDATE event_outbox
                        SET status = %s, error_message = %s, retry_count = %s, processed_at = %s
                        WHERE id = %s
                    """, (EventStatus.FAILED.value, error_message, retry_count, datetime.now(), event_id))
                else:
                    cur.execute("""
                        UPDATE event_outbox
                        SET status = %s, error_message = %s, retry_count = retry_count + 1, processed_at = %s
                        WHERE id = %s
                    """, (EventStatus.FAILED.value, error_message, datetime.now(), event_id))
                
                return cur.rowcount > 0
                
        except Exception as e:
            logger.error(f"Error marking event as failed: {str(e)}")
            return False


def reset_failed_events(max_retries: int = 3) -> int:
    """Reset failed events back to pending if retry count is below max"""
    if not DB_ENABLED:
        return 0
    
    with get_db_connection() as conn:
        if not conn:
            return 0
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE event_outbox
                    SET status = %s, error_message = NULL, processed_at = NULL
                    WHERE status = %s AND retry_count < %s
                    RETURNING id
                """, (EventStatus.PENDING.value, EventStatus.FAILED.value, max_retries))
                
                return cur.rowcount
                
        except Exception as e:
            logger.error(f"Error resetting failed events: {str(e)}")
            return 0

