# Listing Management API Routes
from fastapi import APIRouter, HTTPException, Depends, Path, Query
from typing import List, Optional
from uuid import UUID
from ..schemas.listing import (
    ListingUpdate, ListingContactLink, ListingContactUnlink, 
    ListingActivityOut, ListingOut
)
from ..schemas.crm import ContactOut
from ..schemas.user import UserOut
from ..core.auth import get_current_user
from ..repositories.listing_management import (
    update_listing, get_listing_by_id, link_contact_to_listing, 
    unlink_contact_from_listing, get_listing_contacts, get_listing_activities
)
import logging

listing_management_router = APIRouter(prefix="/listings", tags=["listing-management"])

# ==============================================
# LISTING UPDATE ENDPOINTS
# ==============================================

@listing_management_router.put("/{listing_id}", response_model=ListingOut)
def update_listing_info(
    listing_id: int = Path(..., description="ID of the listing to update"),
    update_data: ListingUpdate = ...,
    current_user: UserOut = Depends(get_current_user)
):
    """Update listing information"""
    try:
        updated_listing = update_listing(listing_id, update_data, current_user.id)
        if not updated_listing:
            raise HTTPException(status_code=404, detail="Listing not found or update failed")
        return updated_listing
    except Exception as e:
        logging.error(f"Error updating listing {listing_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update listing")

@listing_management_router.get("/{listing_id}", response_model=ListingOut)
def get_listing_details(
    listing_id: int = Path(..., description="ID of the listing to retrieve"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get detailed listing information including contacts"""
    try:
        listing = get_listing_by_id(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        return listing
    except Exception as e:
        logging.error(f"Error getting listing {listing_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve listing")

# ==============================================
# CONTACT LINKING ENDPOINTS
# ==============================================

@listing_management_router.post("/{listing_id}/contacts", response_model=dict)
def link_contact_to_listing_endpoint(
    listing_id: int = Path(..., description="ID of the listing"),
    contact_link: ListingContactLink = ...,
    current_user: UserOut = Depends(get_current_user)
):
    """Link a contact to a listing"""
    try:
        success = link_contact_to_listing(listing_id, contact_link, current_user.id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to link contact to listing")
        return {"message": "Contact linked successfully", "listing_id": listing_id, "contact_id": str(contact_link.contact_id)}
    except Exception as e:
        logging.error(f"Error linking contact to listing {listing_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to link contact")

@listing_management_router.delete("/{listing_id}/contacts/{contact_id}", response_model=dict)
def unlink_contact_from_listing_endpoint(
    listing_id: int = Path(..., description="ID of the listing"),
    contact_id: UUID = Path(..., description="ID of the contact to unlink"),
    current_user: UserOut = Depends(get_current_user)
):
    """Unlink a contact from a listing"""
    try:
        success = unlink_contact_from_listing(listing_id, contact_id, current_user.id)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to unlink contact from listing")
        return {"message": "Contact unlinked successfully", "listing_id": listing_id, "contact_id": str(contact_id)}
    except Exception as e:
        logging.error(f"Error unlinking contact from listing {listing_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to unlink contact")

@listing_management_router.get("/{listing_id}/contacts", response_model=List[ContactOut])
def get_listing_contacts_endpoint(
    listing_id: int = Path(..., description="ID of the listing"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all contacts linked to a listing"""
    try:
        contacts = get_listing_contacts(listing_id)
        return contacts
    except Exception as e:
        logging.error(f"Error getting contacts for listing {listing_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve contacts")

# ==============================================
# ACTIVITY HISTORY ENDPOINTS
# ==============================================

@listing_management_router.get("/{listing_id}/activities", response_model=List[ListingActivityOut])
def get_listing_activities_endpoint(
    listing_id: int = Path(..., description="ID of the listing"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of activities to return"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get activity history for a listing"""
    try:
        activities = get_listing_activities(listing_id)
        return activities[:limit]  # Limit results
    except Exception as e:
        logging.error(f"Error getting activities for listing {listing_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve activities")
