from fastapi import APIRouter
from typing import List
from schemas.listing import ListingIn, ListingOut
from repositories.listings import ingest_listings

router = APIRouter(prefix="/ingest", tags=["ingest"])

@router.post("", response_model=List[ListingOut])
def ingest(listings: List[ListingIn]):
    return ingest_listings(listings)
