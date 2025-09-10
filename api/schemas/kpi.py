from pydantic import BaseModel
from typing import Optional

class KpiMetrics(BaseModel):
    """KPI metrics response schema"""
    average_profit_per_unit: float
    lead_to_purchase_time: float
    aged_inventory: int
    total_listings: int
    active_buyers: int
    conversion_rate: float
    average_price: float
    total_value: float
    scoring_rate: float
    average_score: float

class KpiResponse(BaseModel):
    """Complete KPI response with all metrics"""
    metrics: KpiMetrics
    success: bool = True
    message: Optional[str] = None
