from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from ..schemas.listing import ListingIn, ListingOut, ListingScoreIn
from ..schemas.notify import NotifyItem, NotifyResponse
from ..schemas.scoring import ScoreResponse
from ..repositories.repositories import ingest_listings, list_listings, list_listings_by_buyer, get_buyer_stats, update_cached_score, insert_score
from ..core.auth import get_current_user
from ..schemas.user import UserOut
from ..services.services import score_listing, notify as do_notify

# Create routers for each endpoint group
ingest_router = APIRouter(prefix="/ingest", tags=["ingest"])
listings_router = APIRouter(prefix="/listings", tags=["listings"])
score_router = APIRouter(prefix="/score", tags=["score"])
notify_router = APIRouter(prefix="/notify", tags=["notify"])

# Ingest routes
@ingest_router.post("", response_model=List[ListingOut])
def ingest(listings: List[ListingIn], current_user: UserOut = Depends(get_current_user)):
    return ingest_listings(listings, buyer_id=str(current_user.id))

# Listings routes
@listings_router.get("", response_model=List[ListingOut])
def list_(limit: int = Query(500, ge=1, le=1000)):
    return list_listings(limit=limit)

@listings_router.get("/buyer/{buyer_id}", response_model=List[ListingOut])
def list_by_buyer(
    buyer_id: str,
    start_date: Optional[datetime] = Query(None, description="Start date for filtering (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering (ISO format)"),
    limit: int = Query(500, ge=1, le=1000)
):
    """Get listings for a specific buyer with optional date filtering"""
    return list_listings_by_buyer(buyer_id, start_date, end_date, limit)

@listings_router.get("/buyer/{buyer_id}/stats")
def get_buyer_performance_stats(
    buyer_id: str,
    start_date: Optional[datetime] = Query(None, description="Start date for filtering (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering (ISO format)")
):
    """Get performance statistics for a specific buyer"""
    return get_buyer_stats(buyer_id, start_date, end_date)

# Score routes
@score_router.post("", response_model=List[ScoreResponse])
def score(payload: List[ListingScoreIn]):
    out: list[ScoreResponse] = []
    for item in payload:
        score_val, buy_max, reasons = score_listing(item)
        vin_key = item.vin.strip().upper() if item.vin and item.vin.strip() else None
        if vin_key:
            insert_score(item.vehicle_key, vin_key, score_val, buy_max, reasons)
            update_cached_score(vin_key, score_val, buy_max, reasons)
        out.append(ScoreResponse(vehicle_key=item.vehicle_key, vin=item.vin, score=score_val, buyMax=buy_max, reasonCodes=reasons))
    return out

# Notify routes
@notify_router.post("", response_model=List[NotifyResponse])
def notify(items: List[NotifyItem]):
    return [NotifyResponse(**do_notify(it)) for it in items]
