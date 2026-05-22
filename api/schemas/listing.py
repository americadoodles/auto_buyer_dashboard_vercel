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
    lpn: Optional[str] = None
    price: float
    miles: int
    title: Optional[str] = None
    # Direct year/make/model/trim from the source (e.g. FB's
    # vehicle_make_display_name). Win over the AI-extracted values when present.
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    trim: Optional[str] = None
    dom: int
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
    fbUserId: Optional[str] = None
    phoneNumber: Optional[str] = None
    engine: Optional[str] = None
    engine_size: Optional[str] = None
    driveType: Optional[str] = None
    bodyStyle: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    reasonCodes: List[str] = []
    buyMax: Optional[float] = None
    id: Optional[str] = None               # optional on ingest
    buyer_id: Optional[str] = None
    decision: Optional[Decision] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # FB Marketplace fields (added migration 023)
    fbListingId: Optional[str] = None
    marketplaceCategoryId: Optional[str] = None
    currency: Optional[str] = None
    fbCreationTime: Optional[int] = None   # FB epoch seconds; converted to TIMESTAMPTZ on insert
    city: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    isLive: Optional[bool] = None
    isSold: Optional[bool] = None
    isPending: Optional[bool] = None
    sellerType: Optional[str] = None
    fbSellerRating: Optional[float] = None
    fbSellerRatingCount: Optional[int] = None
    fbVerified: Optional[bool] = None
    # Additional FB Marketplace fields (migration 024)
    customTitle: Optional[str] = None
    dealershipName: Optional[str] = None
    deliveryTypes: Optional[List[str]] = None
    listingInventoryType: Optional[str] = None
    country: Optional[str] = None
    cityDisplayName: Optional[str] = None
    fbCityId: Optional[str] = None
    isOnMarketplace: Optional[bool] = None
    isDraft: Optional[bool] = None
    fbIsHidden: Optional[bool] = None
    vehicleCondition: Optional[str] = None
    vehicleTitleStatus: Optional[str] = None
    vehicleFeatures: Optional[List[str]] = None
    vehicleNumberOfOwners: Optional[int] = None
    vehicleIsPaidOff: Optional[bool] = None
    odometerUnit: Optional[str] = None
    horsePower: Optional[float] = None
    gasMileageCity: Optional[float] = None
    gasMileageHighway: Optional[float] = None
    gasMileageCombined: Optional[float] = None
    co2Emissions: Optional[float] = None
    safetyRatingOverall: Optional[float] = None
    safetyRatingFront: Optional[float] = None
    safetyRatingSide: Optional[float] = None
    safetyRatingRollover: Optional[float] = None
    safetyRatingSideBarrier: Optional[float] = None

class ListingOut(BaseModel):
    id: str
    vehicle_key: str
    vin: Optional[str] = None
    lpn: Optional[str] = None
    price: float
    miles: int
    dom: int
    year: Optional[int] = 0
    make: Optional[str] = ""
    model: Optional[str] = ""
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
    fbUserId: Optional[str] = None
    phoneNumber: Optional[str] = None
    engine: Optional[str] = None
    engine_size: Optional[str] = None
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
