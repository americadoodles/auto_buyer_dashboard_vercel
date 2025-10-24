from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID

class Decision(BaseModel):
    buyMax: float = 0
    status: str = ''
    reasons: List[str] = []

class ListingIn(BaseModel):
    vin: Optional[str] = None
    price: float
    miles: int
    dom: int
    source: Optional[str] = None
    year: int
    make: str
    model: str
    trim: Optional[str] = None
    id: Optional[str] = None               # optional on ingest
    radius: Optional[int] = 25
    reasonCodes: List[str] = []
    buyMax: Optional[float] = None
    status: Optional[str] = None
    location: Optional[str] = None
    buyer_id: Optional[str] = None
    decision: Optional[Decision] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ListingOut(BaseModel):
    id: str
    vehicle_key: str
    vin: Optional[str] = None
    year: int
    make: str
    model: str
    trim: Optional[str] = None
    miles: int
    price: float
    score: Optional[int] = None
    dom: int
    source: Optional[str] = None
    radius: Optional[int] = 25
    reasonCodes: List[str] = []
    buyMax: Optional[float] = None
    status: Optional[str] = None
    location: Optional[str] = None
    buyer_id: Optional[str] = None
    buyer_username: Optional[str] = None
    decision: Optional[Decision] = None
    # New editable fields
    notes: Optional[str] = None
    condition_rating: Optional[int] = None
    interior_color: Optional[str] = None
    exterior_color: Optional[str] = None
    transmission: Optional[str] = None
    fuel_type: Optional[str] = None
    drivetrain: Optional[str] = None
    engine_size: Optional[str] = None
    body_style: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    # Contact information
    primary_contact_id: Optional[UUID] = None
    primary_contact_first_name: Optional[str] = None
    primary_contact_last_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    primary_contact_company: Optional[str] = None
    contacts_count: Optional[int] = 0

class ListingScoreIn(BaseModel):
    vehicle_key: str
    vin: Optional[str] = None
    price: float
    miles: int
    dom: int
    source: Optional[str] = None

class ListingUpdate(BaseModel):
    """Schema for updating listing information"""
    vin: Optional[str] = None
    notes: Optional[str] = None
    condition_rating: Optional[int] = Field(None, ge=1, le=5)
    interior_color: Optional[str] = None
    exterior_color: Optional[str] = None
    transmission: Optional[str] = None
    fuel_type: Optional[str] = None
    drivetrain: Optional[str] = None
    engine_size: Optional[str] = None
    body_style: Optional[str] = None
    price: Optional[float] = None
    miles: Optional[int] = None
    location: Optional[str] = None

class ListingContactLink(BaseModel):
    """Schema for linking a contact to a listing"""
    contact_id: UUID
    relationship_type: str = "seller"  # 'seller', 'dealer', 'contact', 'other'
    is_primary: bool = False
    notes: Optional[str] = None

class ListingContactUnlink(BaseModel):
    """Schema for unlinking a contact from a listing"""
    contact_id: UUID

class ListingActivityOut(BaseModel):
    """Schema for listing activity history"""
    id: int
    listing_id: int
    activity_type: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime
    created_by: Optional[str] = None
