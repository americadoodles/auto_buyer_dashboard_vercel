from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone


class AccuTradeDataIn(BaseModel):
    """Schema for incoming AccuTrade data"""
    vin: str = Field(..., description="Vehicle Identification Number")
    options: Optional[Dict[str, Any]] = Field(None, description="Vehicle options and their prices")
    pricebar: Optional[Dict[str, Any]] = Field(None, description="Pricing information (Instant Offer, Target Auction, MMR, etc.)")
    localMarketListing: Optional[Dict[str, Any]] = Field(None, description="Local market listing information")
    localMarketStats: Optional[Dict[str, Any]] = Field(None, description="Local market statistics")
    
    class Config:
        populate_by_name = True


class AccuTradeDataOut(BaseModel):
    """Schema for outgoing AccuTrade data"""
    id: int
    vin: str
    options: Optional[Dict[str, Any]] = None
    pricebar: Optional[Dict[str, Any]] = None
    local_market_listing: Optional[Dict[str, Any]] = None
    local_market_stats: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AccuTradeDataUpdate(BaseModel):
    """Schema for updating AccuTrade data"""
    options: Optional[Dict[str, Any]] = None
    pricebar: Optional[Dict[str, Any]] = None
    localMarketListing: Optional[Dict[str, Any]] = None
    localMarketStats: Optional[Dict[str, Any]] = None

class AccuTradeDataStatus(BaseModel):
    """Schema for AccuTrade data status"""
    success: bool
    status_code: int