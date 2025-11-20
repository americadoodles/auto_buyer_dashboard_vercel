# Event Schemas for CRM Event Bus
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


class EventType(str, Enum):
    """Event types in the CRM system"""
    LEAD_CREATED = "LeadCreated"
    COMMUNICATION_LOGGED = "CommunicationLogged"
    DEAL_CREATED = "DealCreated"
    DEAL_STAGE_CHANGED = "DealStageChanged"


class EventStatus(str, Enum):
    """Event processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class EventBase(BaseModel):
    """Base event schema"""
    event_type: EventType
    payload: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class LeadCreatedEvent(BaseModel):
    """LeadCreated event payload"""
    lead_id: UUID
    contact_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    created_by: UUID
    created_at: datetime


class CommunicationLoggedEvent(BaseModel):
    """CommunicationLogged event payload"""
    communication_id: UUID
    from_user_id: Optional[UUID] = None
    to_contact_id: Optional[UUID] = None
    to_lead_id: Optional[UUID] = None
    communication_type: str  # 'email', 'call', 'sms', 'meeting'
    direction: str  # 'inbound', 'outbound'
    created_at: datetime


class DealCreatedEvent(BaseModel):
    """DealCreated event payload"""
    deal_id: UUID
    contact_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    deal_stage_id: Optional[int] = None
    created_by: UUID
    created_at: datetime


class DealStageChangedEvent(BaseModel):
    """DealStageChanged event payload"""
    deal_id: UUID
    old_stage_id: Optional[int] = None
    new_stage_id: Optional[int] = None
    changed_by: UUID
    changed_at: datetime


class EventOut(BaseModel):
    """Event output schema"""
    id: UUID
    event_type: EventType
    payload: Dict[str, Any]
    status: EventStatus
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    retry_count: int = 0
    error_message: Optional[str] = None

