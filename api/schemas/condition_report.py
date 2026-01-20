from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class LineItem(BaseModel):
    """Schema for condition report line items"""
    text: str
    price: str
    priceClass: str
    itemClass: Optional[str] = None
    selected: bool


class SpecialData(BaseModel):
    """Schema for special data in condition report sections"""
    graphicType: Optional[str] = None
    damageItems: Optional[List[Any]] = None
    noDamage: Optional[bool] = None
    noDamageText: Optional[str] = None
    tread: Optional[List[Dict[str, Any]]] = None
    wheelIssues: Optional[List[Dict[str, Any]]] = None
    hasIssues: Optional[bool] = None
    issues: Optional[List[Any]] = None
    noIssuesText: Optional[str] = None
    svgImage: Optional[str] = None

class Section(BaseModel):
    """Schema for condition report sections"""
    type: str
    dataQa: str
    title: str
    subtitle: Optional[str] = None
    headerPrice: Optional[str] = None
    panelClass: Optional[str] = None
    icon: Optional[str] = None
    lineItems: List[LineItem] = []
    unselectedItems: List[str] = []
    specialData: SpecialData = Field(default_factory=SpecialData)
    headerPriceClass: Optional[str] = None


class ConditionReportIn(BaseModel):
    """Schema for incoming condition report data"""
    vin: str = Field(..., description="Vehicle Identification Number")
    sections: List[Section] = Field(..., description="List of condition report sections")
    keyValuePairs: Optional[Dict[str, str]] = Field(None, description="Summary key-value pairs")
    
    class Config:
        populate_by_name = True


class ConditionReportOut(BaseModel):
    """Schema for outgoing condition report data"""
    id: int
    vin: str
    sections: List[Dict[str, Any]]
    key_value_pairs: Optional[Dict[str, str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConditionReportUpdate(BaseModel):
    """Schema for updating condition report data"""
    sections: Optional[List[Section]] = None
    keyValuePairs: Optional[Dict[str, str]] = None


class ConditionReportStatus(BaseModel):
    """Schema for condition report status response"""
    success: bool
    status_code: int
    message: Optional[str] = None
    record_id: Optional[int] = None
