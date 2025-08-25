from fastapi import APIRouter, Query
from schemas.listing import ListingOut
from repositories.listings import list_listings

router = APIRouter(prefix="/listings", tags=["listings"])

@router.get("", response_model=list[ListingOut])
def list_(limit: int = Query(500, ge=1, le=1000)):
    return list_listings(limit=limit)
