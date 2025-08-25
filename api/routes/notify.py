from fastapi import APIRouter
from typing import List
from schemas.listing import ListingScoreIn
from schemas.scoring import ScoreResponse
from services.scoring import score_listing
from repositories.scores import insert_score
from repositories.listings import update_cached_score

router = APIRouter(prefix="/score", tags=["score"])

@router.post("", response_model=List[ScoreResponse])
def score(payload: List[ListingScoreIn]):
    out: list[ScoreResponse] = []
    for item in payload:
        score_val, buy_max, reasons = score_listing(item)
        vin_key = (item.vin or "").strip().upper()
        insert_score(vin_key, score_val, buy_max, reasons)
        update_cached_score(vin_key, score_val, buy_max, reasons)
        out.append(ScoreResponse(vin=item.vin, score=score_val, buyMax=buy_max, reasonCodes=reasons))
    return out
