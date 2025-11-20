# Event Bus Service
import logging
from typing import Optional, Callable, Dict, Any
from uuid import UUID
from datetime import datetime
from ..repositories.event_outbox import (
    create_outbox_event, get_pending_events, mark_event_processing,
    mark_event_completed, mark_event_failed, reset_failed_events
)
from ..schemas.events import (
    EventType, EventStatus, EventOut,
    LeadCreatedEvent, CommunicationLoggedEvent, DealCreatedEvent, DealStageChangedEvent
)

logger = logging.getLogger(__name__)


class EventBus:
    """Event bus service implementing outbox pattern"""
    
    def __init__(self):
        self.subscribers: Dict[EventType, list] = {}
    
    def subscribe(self, event_type: EventType, handler: Callable):
        """Subscribe to an event type"""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
        logger.info(f"Subscribed handler to {event_type.value}")
    
    def publish(self, event_type: EventType, payload: dict, metadata: Optional[dict] = None) -> Optional[UUID]:
        """Publish an event using outbox pattern"""
        try:
            event_id = create_outbox_event(event_type, payload, metadata)
            if event_id:
                logger.info(f"Published event {event_type.value} with ID {event_id}")
            return event_id
        except Exception as e:
            logger.error(f"Error publishing event {event_type.value}: {str(e)}")
            return None
    
    def process_pending_events(self, batch_size: int = 100) -> int:
        """Process pending events from outbox"""
        pending_events = get_pending_events(limit=batch_size)
        processed_count = 0
        
        for event in pending_events:
            try:
                # Mark as processing
                if not mark_event_processing(event.id):
                    continue
                
                # Process event
                success = self._process_event(event)
                
                if success:
                    mark_event_completed(event.id)
                    processed_count += 1
                else:
                    mark_event_failed(event.id, "Event processing failed", event.retry_count + 1)
                    
            except Exception as e:
                logger.error(f"Error processing event {event.id}: {str(e)}")
                mark_event_failed(event.id, str(e), event.retry_count + 1)
        
        return processed_count
    
    def _process_event(self, event: EventOut) -> bool:
        """Process a single event by calling subscribers"""
        event_type = event.event_type
        
        if event_type not in self.subscribers:
            logger.warning(f"No subscribers for event type {event_type.value}")
            return True  # Not an error if no subscribers
        
        handlers = self.subscribers[event_type]
        all_success = True
        
        for handler in handlers:
            try:
                handler(event.payload)
            except Exception as e:
                logger.error(f"Error in handler for {event_type.value}: {str(e)}")
                all_success = False
        
        return all_success
    
    def reset_failed_events(self, max_retries: int = 3) -> int:
        """Reset failed events back to pending for retry"""
        return reset_failed_events(max_retries)


# Global event bus instance
event_bus = EventBus()


# Convenience functions for publishing events
def publish_lead_created(lead_id: UUID, contact_id: Optional[UUID], assigned_to: Optional[UUID], created_by: UUID) -> Optional[UUID]:
    """Publish LeadCreated event"""
    payload = {
        "lead_id": str(lead_id),
        "contact_id": str(contact_id) if contact_id else None,
        "assigned_to": str(assigned_to) if assigned_to else None,
        "created_by": str(created_by),
        "created_at": datetime.now().isoformat()
    }
    return event_bus.publish(EventType.LEAD_CREATED, payload)


def publish_communication_logged(
    communication_id: UUID,
    from_user_id: Optional[UUID],
    to_contact_id: Optional[UUID],
    to_lead_id: Optional[UUID],
    communication_type: str,
    direction: str
) -> Optional[UUID]:
    """Publish CommunicationLogged event"""
    payload = {
        "communication_id": str(communication_id),
        "from_user_id": str(from_user_id) if from_user_id else None,
        "to_contact_id": str(to_contact_id) if to_contact_id else None,
        "to_lead_id": str(to_lead_id) if to_lead_id else None,
        "communication_type": communication_type,
        "direction": direction,
        "created_at": datetime.now().isoformat()
    }
    return event_bus.publish(EventType.COMMUNICATION_LOGGED, payload)


def publish_deal_created(
    deal_id: UUID,
    contact_id: Optional[UUID],
    assigned_to: Optional[UUID],
    deal_stage_id: Optional[int],
    created_by: UUID
) -> Optional[UUID]:
    """Publish DealCreated event"""
    payload = {
        "deal_id": str(deal_id),
        "contact_id": str(contact_id) if contact_id else None,
        "assigned_to": str(assigned_to) if assigned_to else None,
        "deal_stage_id": deal_stage_id,
        "created_by": str(created_by),
        "created_at": datetime.now().isoformat()
    }
    return event_bus.publish(EventType.DEAL_CREATED, payload)


def publish_deal_stage_changed(
    deal_id: UUID,
    old_stage_id: Optional[int],
    new_stage_id: Optional[int],
    changed_by: UUID
) -> Optional[UUID]:
    """Publish DealStageChanged event"""
    payload = {
        "deal_id": str(deal_id),
        "old_stage_id": old_stage_id,
        "new_stage_id": new_stage_id,
        "changed_by": str(changed_by),
        "changed_at": datetime.now().isoformat()
    }
    return event_bus.publish(EventType.DEAL_STAGE_CHANGED, payload)

