from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field
from uuid import UUID

class Decision(BaseModel):
    buyMax: float = 0
    status: str = ''
    reasons: List[str] = []

class ListingIn(BaseModel):
    vin: Optional[str] = None
    lpn: Optional[str] = None
    price: float
    miles: int
    dom: int
    year: int
    make: str
    model: str
    location: Optional[str] = None
    radius: Optional[int] = 25
    images: List[str] = []
    transmission: Optional[str] = None
    exteriorColor: Optional[str] = None
    interiorColor: Optional[str] = None
    fuelType: Optional[str] = None
    overallRating: Optional[str] = None
    detailedRatings: Optional[List[str]] = None
    condition: Optional[str] = None
    mpg: Optional[str] = None
    cleanTitle: Optional[bool] = None
    paidStatus: Optional[str] = None
    sellerDescription: Optional[str] = None
    sellerName: Optional[str] = None
    sellerJoinedDate: Optional[str] = None
    phoneNumber: Optional[str] = None
    engine: Optional[str] = None
    driveType: Optional[str] = None
    bodyStyle: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    reasonCodes: List[str] = []
    buyMax: Optional[float] = None
    trim: Optional[str] = None
    id: Optional[str] = None               # optional on ingest
    buyer_id: Optional[str] = None
    decision: Optional[Decision] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ListingOut(BaseModel):
    id: str
    vehicle_key: str
    vin: Optional[str] = None
    lpn: Optional[str] = None
    price: float
    miles: int
    dom: int
    year: int
    make: str
    model: str
    location: Optional[str] = None
    radius: Optional[int] = 25
    images: Optional[List[str]] = None
    transmission: Optional[str] = None
    exteriorColor: Optional[str] = None
    interiorColor: Optional[str] = None
    fuelType: Optional[str] = None
    overallRating: Optional[str] = None
    detailedRatings: Optional[List[str]] = None
    condition: Optional[str] = None
    mpg: Optional[str] = None
    cleanTitle: Optional[bool] = None
    paidStatus: Optional[str] = None
    sellerDescription: Optional[str] = None
    sellerName: Optional[str] = None
    sellerJoinedDate: Optional[str] = None
    phoneNumber: Optional[str] = None
    engine: Optional[str] = None
    driveType: Optional[str] = None
    bodyStyle: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    reasonCodes: List[str] = []
    buyMax: Optional[float] = None
    trim: Optional[str] = None
    buyer_id: Optional[str] = None
    buyer_username: Optional[str] = None
    decision: Optional[Decision] = None
    created_at: Optional[datetime] = None
    notes: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    score: Optional[int] = None
    mmr: Optional[float] = None

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
    lpn: Optional[str] = None
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
    dom: Optional[int] = None
    location: Optional[str] = None
    images: Optional[List[str]] = None
    mmr: Optional[float] = None
    overall_rating: Optional[str] = None
    condition: Optional[str] = None
    mpg: Optional[str] = None
    clean_title: Optional[bool] = None
    paid_status: Optional[str] = None
    seller_name: Optional[str] = None
    phone_number: Optional[str] = None
    seller_description: Optional[str] = None
    seller_joined_date: Optional[str] = None
    detailed_ratings: Optional[List[str]] = None
    status: Optional[str] = None
    score: Optional[int] = None
    buy_max: Optional[float] = None
    radius: Optional[int] = None

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
