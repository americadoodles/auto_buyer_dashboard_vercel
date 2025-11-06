# Listing Management API Routes
from fastapi import APIRouter, HTTPException, Depends, Path, Query, UploadFile, File
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
import os
import uuid
from pathlib import Path
from datetime import datetime
import requests

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
        logging.info(f"Attempting to update listing {listing_id} with data: {update_data}")
        logging.info(f"Update data model dump: {update_data.model_dump(exclude_unset=True)}")
        logging.info(f"Current user ID: {current_user.id} (type: {type(current_user.id)})")
        
        updated_listing = update_listing(listing_id, update_data, str(current_user.id))
        if not updated_listing:
            logging.error(f"update_listing returned None for listing {listing_id}")
            raise HTTPException(status_code=404, detail="Listing not found or update failed")
        
        logging.info(f"Successfully updated listing {listing_id}")
        return updated_listing
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating listing {listing_id}: {str(e)}")
        logging.error(f"Exception type: {type(e)}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
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

@listing_management_router.put("/{listing_id}/test")
def test_update_listing(
    listing_id: int = Path(..., description="ID of the listing to test update"),
    current_user: UserOut = Depends(get_current_user)
):
    """Test endpoint for debugging listing updates"""
    try:
        from ..repositories.listing_management import update_listing
        from ..schemas.listing import ListingUpdate
        
        # Create a simple test update
        test_update = ListingUpdate(notes="Test update from debug endpoint")
        
        logging.info(f"Testing update for listing {listing_id}")
        logging.info(f"User ID: {current_user.id}")
        
        result = update_listing(listing_id, test_update, str(current_user.id))
        
        if result:
            return {"success": True, "message": "Update successful", "listing_id": listing_id}
        else:
            return {"success": False, "message": "Update failed", "listing_id": listing_id}
            
    except Exception as e:
        logging.error(f"Test update error: {str(e)}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e), "listing_id": listing_id}

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
        success = unlink_contact_from_listing(listing_id, contact_id, str(current_user.id))
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

# ==============================================
# IMAGE UPLOAD ENDPOINTS
# ==============================================

@listing_management_router.post("/{listing_id}/images/upload")
async def upload_listing_image(
    listing_id: int = Path(..., description="ID of the listing"),
    file: UploadFile = File(..., description="Image file to upload"),
    current_user: UserOut = Depends(get_current_user)
):
    """Upload an image for a listing using Vercel Blob storage"""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Validate file size (max 10MB)
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail="File size must be less than 10MB")
        
        # Get Vercel Blob token from environment
        blob_token = os.getenv("BLOB_READ_WRITE_TOKEN")
        if not blob_token:
            raise HTTPException(status_code=500, detail="Vercel Blob token not configured")
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix if file.filename else '.jpg'
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create folder structure: listings/{listing_id}/{filename}
        # This organizes images by vehicle/listing
        blob_path = f"listings/{listing_id}/{unique_filename}"
        
        # Upload to Vercel Blob using REST API
        # Vercel Blob API endpoint - using POST with multipart form data
        blob_api_url = "https://blob.vercel-storage.com"
        
        # Prepare multipart form data
        files = {
            'file': (unique_filename, file_content, file.content_type or "image/jpeg")
        }
        
        data = {
            'pathname': blob_path,
            'access': 'public'
        }
        
        headers = {
            "Authorization": f"Bearer {blob_token}",
        }
        
        # Upload to Vercel Blob
        response = requests.post(
            blob_api_url,
            headers=headers,
            files=files,
            data=data,
            timeout=30
        )
        
        if response.status_code not in [200, 201]:
            logging.error(f"Vercel Blob upload failed: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to upload to Vercel Blob: {response.status_code} - {response.text}"
            )
        
        # Get the URL from response
        blob_data = response.json()
        image_url = blob_data.get("url")
        
        if not image_url:
            logging.error(f"Vercel Blob response missing URL: {blob_data}")
            raise HTTPException(status_code=500, detail="Failed to get image URL from Vercel Blob")
        
        logging.info(f"Image uploaded successfully for listing {listing_id}: {image_url}")
        
        return {
            "url": image_url,
            "filename": unique_filename,
            "path": blob_path,
            "listing_id": listing_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error uploading image for listing {listing_id}: {str(e)}")
        import traceback
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")
