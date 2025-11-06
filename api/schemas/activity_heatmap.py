from typing import List
from pydantic import BaseModel
from datetime import date


class ActivityData(BaseModel):
    date: str
    count: int
    level: int


class ActivityHeatmapResponse(BaseModel):
    data: List[ActivityData]
    total_activities: int
    active_days: int
    average_per_week: float
