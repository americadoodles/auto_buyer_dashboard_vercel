from fastapi import APIRouter, Query
from typing import List
from schemas.listing import ListingIn, ListingOut, ListingScoreIn
from schemas.notify import NotifyItem, NotifyResponse
from schemas.scoring import ScoreResponse
from repositories.listings import ingest_listings, list_listings, update_cached_score
from repositories.scores import insert_score
from services.scoring import score_listing
from services.notify import notify as do_notify

# Create routers for each endpoint group
ingest_router = APIRouter(prefix="/ingest", tags=["ingest"])
listings_router = APIRouter(prefix="/listings", tags=["listings"])
score_router = APIRouter(prefix="/score", tags=["score"])
notify_router = APIRouter(prefix="/notify", tags=["notify"])

# Ingest routes
@ingest_router.post("", response_model=List[ListingOut])
def ingest(listings: List[ListingIn]):
    return ingest_listings(listings)

# Listings routes
@listings_router.get("", response_model=list[ListingOut])
def list_(limit: int = Query(500, ge=1, le=1000)):
    return list_listings(limit=limit)

# Score routes
@score_router.post("", response_model=List[ScoreResponse])
def score(payload: List[ListingScoreIn]):
    out: list[ScoreResponse] = []
    for item in payload:
        score_val, buy_max, reasons = score_listing(item)
        vin_key = (item.vin or "").strip().upper()
        insert_score(vin_key, score_val, buy_max, reasons)
        update_cached_score(vin_key, score_val, buy_max, reasons)
        out.append(ScoreResponse(vin=item.vin, score=score_val, buyMax=buy_max, reasonCodes=reasons))
    return out

# Notify routes
@notify_router.post("", response_model=List[NotifyResponse])
def notify(items: List[NotifyItem]):
    return [NotifyResponse(**do_notify(it)) for it in items]
