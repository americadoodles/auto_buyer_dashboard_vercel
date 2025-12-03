from pydantic import BaseModel
from typing import List, Optional

class DistributionItem(BaseModel):
    """Single item in a distribution chart"""
    name: str
    value: int

class ChartDistributionResponse(BaseModel):
    """Response for chart distribution data"""
    data: List[DistributionItem]
    success: bool = True
    message: Optional[str] = None

class TimeSeriesDataPoint(BaseModel):
    """Single data point in a time series chart"""
    date: str
    value: int

class ChartTimeSeriesResponse(BaseModel):
    """Response for chart time series data"""
    data: List[TimeSeriesDataPoint]
    success: bool = True
    message: Optional[str] = None

