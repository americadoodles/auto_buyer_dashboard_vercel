from typing import List
from pydantic import BaseModel, Field

class ScoreResponse(BaseModel):
    vehicle_key: str
    vin: str
    score: int = Field(..., ge=0, le=100)
    buyMax: float
    reasonCodes: List[str]
