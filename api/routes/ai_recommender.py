from fastapi import APIRouter, HTTPException
import logging

from ..schemas.ai_recommender import (
    AskRequest, AskResponse,
    RecommendRequest, RecommendResponse,
    MatchRequest, MatchResponse,
)
from ..services.ai_recommender_service import (
    ask_question,
    recommend_vehicle,
    match_vehicles,
)

logger = logging.getLogger(__name__)

ai_recommender_router = APIRouter(prefix="/v1", tags=["ai-recommender"])


@ai_recommender_router.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest):
    """Ask a natural-language question about inventory (RAG)."""
    try:
        data = await ask_question(question=req.question, k=req.k)
        return AskResponse(
            answer=data.get("answer", ""),
            sources=data.get("sources", []),
            question=req.question,
        )
    except Exception as exc:
        logger.exception("AI /ask failed")
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")


@ai_recommender_router.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest):
    """Get AI buy/pass recommendation for a vehicle by VIN."""
    try:
        data = await recommend_vehicle(vin=req.vin)
        return RecommendResponse(
            vin=req.vin,
            recommendation=data.get("recommendation", ""),
            confidence=data.get("confidence"),
            reasoning=data.get("reasoning"),
            data=data.get("data"),
        )
    except Exception as exc:
        logger.exception("AI /recommend failed")
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")


@ai_recommender_router.post("/match", response_model=MatchResponse)
async def match(req: MatchRequest):
    """Match available vehicles to active leads."""
    try:
        data = await match_vehicles()
        return MatchResponse(
            matches=data.get("matches", []),
            total=data.get("total", 0),
        )
    except Exception as exc:
        logger.exception("AI /match failed")
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")
