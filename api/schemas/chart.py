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

