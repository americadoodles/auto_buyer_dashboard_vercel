from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class MMRDataIn(BaseModel):
    """Schema for incoming MMR data"""
    vin: str = Field(..., description="Vehicle Identification Number")
    features: Optional[Dict[str, Any]] = Field(None, description="MMR features (Base MMR, Avg Odometer, Avg Condition, Avg EV Battery Score)")
    transactions: Optional[List[Dict[str, Any]]] = Field(None, description="Transaction history array")
    historicalAverage: Optional[Dict[str, Any]] = Field(None, description="Historical average data (Past 30 Days, 6 Months Ago, Last Year)")
    projectedAverage: Optional[Dict[str, Any]] = Field(None, description="Projected average data (Next Month, etc.)")
    estimatedRetail: Optional[Dict[str, Any]] = Field(None, description="Estimated retail information (Retail, Typical Range)")
    
    class Config:
        populate_by_name = True


class MMRDataOut(BaseModel):
    """Schema for outgoing MMR data"""
    id: int
    vin: str
    features: Optional[Dict[str, Any]] = None
    transactions: Optional[List[Dict[str, Any]]] = None
    historical_average: Optional[Dict[str, Any]] = None
    projected_average: Optional[Dict[str, Any]] = None
    estimated_retail: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MMRDataUpdate(BaseModel):
    """Schema for updating MMR data"""
    features: Optional[Dict[str, Any]] = None
    transactions: Optional[List[Dict[str, Any]]] = None
    historicalAverage: Optional[Dict[str, Any]] = None
    projectedAverage: Optional[Dict[str, Any]] = None
    estimatedRetail: Optional[Dict[str, Any]] = None


class MMRDataStatus(BaseModel):
    """Schema for MMR data status"""
    success: bool
    status_code: int
