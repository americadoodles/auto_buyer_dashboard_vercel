from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

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
    location: Optional[str] = None
    buyer_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
    location: Optional[str] = None
    buyer_id: Optional[str] = None
    buyer_username: Optional[str] = None

class ListingScoreIn(BaseModel):
    vehicle_key: str
    vin: Optional[str] = None
    price: float
    miles: int
    dom: int
    source: Optional[str] = None
