from typing import Optional, List, Any
from pydantic import BaseModel, Field


# --- /api/v1/ask ---

class AskRequest(BaseModel):
    question: str = Field(..., description="Natural language question about inventory")
    k: int = Field(5, ge=1, le=50, description="Number of results to return (default 5)")


class AskResponse(BaseModel):
    answer: str
    sources: List[Any] = []
    question: str


# --- /api/v1/recommend ---

class RecommendRequest(BaseModel):
    vin: str = Field(..., description="Vehicle VIN to get recommendation for")


class RecommendResponse(BaseModel):
    vin: str
    recommendation: str
    confidence: Optional[float] = None
    reasoning: Optional[str] = None
    data: Optional[Any] = None


# --- /api/v1/match ---

class MatchRequest(BaseModel):
    limit: int = Field(10, ge=1, le=100, description="Max matches to return")


class MatchResponse(BaseModel):
    matches: List[Any] = []
    total: int = 0
