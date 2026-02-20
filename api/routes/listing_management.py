# Listing Management API Routes
from fastapi import APIRouter, HTTPException, Depends, Path, Query, UploadFile, File
from typing import List, Optional
from ..schemas.listing import (
    ListingUpdate, 
    ListingActivityOut, ListingOut
)
from ..schemas.user import UserOut
from ..core.auth import get_current_user
from ..core.config import settings
from ..repositories.listing_management import (
    update_listing, get_listing_by_id, get_listing_activities, delete_listing
)
from ..services.ai_service import calculate_listing_score
from ..repositories.repositories import update_cached_score, update_score, list_listings
from ..repositories.mmr_repository import get_adjusted_mmr_for_vin
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
import logging
import os
import uuid
import urllib.parse
import traceback
from pathlib import Path as PathLib
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
        
        # Check if images are being updated and delete removed images from blob storage
        update_dict = update_data.model_dump(exclude_unset=True)
        if "images" in update_dict:
            # Get current listing to compare images
            current_listing = get_listing_by_id(listing_id)
            if current_listing:
                old_images = set(current_listing.images or [])
                new_images = set(update_dict["images"] or [])
                removed_images = old_images - new_images
                
                # Delete removed images from Vercel Blob storage
                if removed_images:
                    logging.info(f"Detected {len(removed_images)} removed images for listing {listing_id}")
                    for removed_image_url in removed_images:
                        blob_deleted = delete_blob_from_vercel(removed_image_url)
                        if blob_deleted:
                            logging.info(f"Successfully deleted blob: {removed_image_url}")
                        else:
                            logging.warning(f"Failed to delete blob (continuing anyway): {removed_image_url}")
        
        updated_listing = update_listing(listing_id, update_data, str(current_user.id))
        if not updated_listing:
            # Check if listing exists to provide more specific error message
            existing_listing = get_listing_by_id(listing_id)
            if not existing_listing:
                logging.error(f"Listing {listing_id} not found")
                raise HTTPException(status_code=404, detail=f"Listing {listing_id} not found")
            else:
                logging.error(f"update_listing returned None for listing {listing_id} (listing exists but update failed)")
                raise HTTPException(status_code=500, detail="Failed to update listing")
        
        logging.info(f"Successfully updated listing {listing_id}")
        return updated_listing
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating listing {listing_id}: {str(e)}")
        logging.error(f"Exception type: {type(e)}")
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

@listing_management_router.delete("/{listing_id}")
def delete_listing_endpoint(
    listing_id: int = Path(..., description="ID of the listing to delete"),
    current_user: UserOut = Depends(get_current_user)
):
    """Delete a listing by ID"""
    try:
        # First check if the listing exists
        existing_listing = get_listing_by_id(listing_id)
        if not existing_listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Delete any images from blob storage
        if existing_listing.images:
            for image_url in existing_listing.images:
                blob_deleted = delete_blob_from_vercel(image_url)
                if blob_deleted:
                    logging.info(f"Deleted blob for listing {listing_id}: {image_url}")
                else:
                    logging.warning(f"Failed to delete blob (continuing anyway): {image_url}")
        
        # Delete the listing
        success = delete_listing(listing_id, str(current_user.id))
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete listing")
        
        logging.info(f"Successfully deleted listing {listing_id} by user {current_user.id}")
        return {"message": "Listing deleted successfully", "listing_id": listing_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting listing {listing_id}: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to delete listing")

@listing_management_router.put("/{listing_id}/test")
def test_update_listing(
    listing_id: int = Path(..., description="ID of the listing to test update"),
    current_user: UserOut = Depends(get_current_user)
):
    """Test endpoint for debugging listing updates"""
    try:
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
        logging.error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e), "listing_id": listing_id}

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
# IMAGE UPLOAD/DELETE HELPER FUNCTIONS
# ==============================================

def delete_blob_from_vercel(image_url: str) -> bool:
    """Delete a blob from Vercel Blob storage using the REST API"""
    try:
        blob_token = settings.BLOB_READ_WRITE_TOKEN
        
        if not blob_token:
            logging.error("BLOB_READ_WRITE_TOKEN not found in environment variables")
            return False
        
        # Extract the blob path from the URL
        # Vercel Blob URLs can be in different formats:
        # - https://{account-id}.public.blob.vercel-storage.com/{path}
        # - https://blob.vercel-storage.com/{path}
        # We need to extract the path part
        
        blob_path = None
        if "blob.vercel-storage.com" in image_url:
            # Handle both formats: public.blob.vercel-storage.com and blob.vercel-storage.com
            if ".public.blob.vercel-storage.com/" in image_url:
                # Format: https://{account-id}.public.blob.vercel-storage.com/{path}
                parts = image_url.split(".public.blob.vercel-storage.com/")
                if len(parts) > 1:
                    blob_path = parts[1].split("?")[0]  # Remove query parameters if any
            elif "blob.vercel-storage.com/" in image_url:
                # Format: https://blob.vercel-storage.com/{path}
                parts = image_url.split("blob.vercel-storage.com/")
                if len(parts) > 1:
                    blob_path = parts[1].split("?")[0]  # Remove query parameters if any
        
        if not blob_path:
            logging.warning(f"Could not extract blob path from URL: {image_url}")
            logging.warning(f"Full URL was: {image_url}")
            return False
        
        # Use DELETE method on the blob API
        # Try multiple approaches: path-based and URL-based
        headers = {
            "Authorization": f"Bearer {blob_token}"
        }
        
        logging.info(f"Attempting to delete blob: {blob_path}")
        logging.info(f"Original image URL: {image_url}")
        
        # Try multiple deletion approaches
        # Approach 1: DELETE using the path (same format as upload)
        blob_api_url = f"https://blob.vercel-storage.com/{blob_path}"
        logging.info(f"Trying path-based deletion: {blob_api_url}")
        
        response = requests.delete(
            blob_api_url,
            headers=headers,
            timeout=30
        )
        
        logging.info(f"Vercel Blob delete response status: {response.status_code}")
        logging.info(f"Vercel Blob delete response headers: {dict(response.headers)}")
        logging.info(f"Vercel Blob delete response text: {response.text}")
        
        if response.status_code in [200, 204]:
            logging.info(f"Successfully deleted blob: {blob_path}")
            return True
        elif response.status_code == 404:
            logging.warning(f"Blob not found (may already be deleted): {blob_path}")
            return True  # Consider 404 as success (already deleted)
        
        # Approach 2: Try with URL as query parameter
        if response.status_code not in [200, 204, 404]:
            logging.info(f"Path-based deletion failed ({response.status_code}), trying URL query parameter method")
            encoded_url = urllib.parse.quote(image_url, safe='')
            url_query_endpoint = f"https://blob.vercel-storage.com/{blob_path}?url={encoded_url}"
            
            response2 = requests.delete(
                url_query_endpoint,
                headers=headers,
                timeout=30
            )
            
            logging.info(f"URL query parameter delete response status: {response2.status_code}")
            logging.info(f"URL query parameter delete response text: {response2.text}")
            
            if response2.status_code in [200, 204]:
                logging.info(f"Successfully deleted blob using URL query parameter: {image_url}")
                return True
            elif response2.status_code == 404:
                logging.warning(f"Blob not found (may already be deleted): {image_url}")
                return True
        
        # Approach 3: Try POST to delete endpoint with URL in body
        if response.status_code not in [200, 204, 404]:
            logging.info(f"Trying POST-based deletion with URL in body")
            delete_endpoint = "https://blob.vercel-storage.com/delete"
            delete_headers = {
                "Authorization": f"Bearer {blob_token}",
                "Content-Type": "application/json"
            }
            delete_payload = {"url": image_url}
            
            response3 = requests.post(
                delete_endpoint,
                headers=delete_headers,
                json=delete_payload,
                timeout=30
            )
            
            logging.info(f"POST-based delete response status: {response3.status_code}")
            logging.info(f"POST-based delete response text: {response3.text}")
            
            if response3.status_code in [200, 204]:
                logging.info(f"Successfully deleted blob using POST method: {image_url}")
                return True
            elif response3.status_code == 404:
                logging.warning(f"Blob not found (may already be deleted): {image_url}")
                return True
        
        # If all approaches failed
        logging.error(f"All deletion approaches failed for blob {blob_path}")
        logging.error(f"Last response status: {response.status_code}")
        logging.error(f"Last response text: {response.text}")
        logging.error(f"Last response headers: {dict(response.headers)}")
        return False
            
    except requests.exceptions.RequestException as req_error:
        logging.error(f"Request error during Vercel Blob deletion: {str(req_error)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return False
    except Exception as e:
        logging.error(f"Error deleting blob from Vercel: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return False

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
        
        # Get Vercel Blob token from settings
        blob_token = settings.BLOB_READ_WRITE_TOKEN
        
        if not blob_token:
            logging.error("BLOB_READ_WRITE_TOKEN not found in environment variables")
            raise HTTPException(status_code=500, detail="Vercel Blob token not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.")
        
        # Generate unique filename
        file_extension = PathLib(file.filename).suffix if file.filename else '.jpg'
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Create folder structure: listings/{listing_id}/{filename}
        # This organizes images by vehicle/listing
        blob_path = f"listings/{listing_id}/{unique_filename}"
        
        # Upload to Vercel Blob using REST API
        # Use the standard Vercel Blob API endpoint
        blob_api_url = f"https://blob.vercel-storage.com/{blob_path}"
        
        headers = {
            "Authorization": f"Bearer {blob_token}",
            "Content-Type": file.content_type or "image/jpeg",
            "x-content-type": file.content_type or "image/jpeg",
            "x-access": "public"
        }
        
        # Upload to Vercel Blob using PUT method
        try:
            response = requests.put(
                blob_api_url,
                headers=headers,
                data=file_content,
                timeout=30
            )
            
            logging.info(f"Vercel Blob response status: {response.status_code}")
            logging.info(f"Vercel Blob response headers: {dict(response.headers)}")
            
            if response.status_code not in [200, 201]:
                error_text = response.text
                logging.error(f"Vercel Blob upload failed: {response.status_code} - {error_text}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to upload to Vercel Blob: {response.status_code} - {error_text}"
                )
            
            # Get the URL from response
            image_url = None
            try:
                blob_data = response.json()
                image_url = blob_data.get("url")
                logging.info(f"Parsed blob data: {blob_data}")
            except Exception as json_error:
                # If response is not JSON, try to construct URL from the path
                logging.warning(f"Could not parse JSON response: {json_error}, response text: {response.text}")
            
            if not image_url:
                # Fallback: construct URL from response or use public CDN URL
                # Vercel Blob public URLs follow the pattern: https://{account-id}.public.blob.vercel-storage.com/{path}
                # Try to extract from response headers or use a default pattern
                # If BLOB_STORE_URL is set, use it; otherwise construct from API response
                blob_store_url = settings.BLOB_STORE_URL
                if blob_store_url:
                    blob_store_url = blob_store_url.rstrip('/')
                    image_url = f"{blob_store_url}/{blob_path}"
                else:
                    # Try to construct from the Location header or use a generic pattern
                    location_header = response.headers.get("Location")
                    if location_header:
                        image_url = location_header
                    else:
                        # Last resort: use the path (this may not work for public access)
                        image_url = f"https://blob.vercel-storage.com/{blob_path}"
                logging.warning(f"Using fallback URL: {image_url}")
            
            logging.info(f"Image uploaded successfully for listing {listing_id}: {image_url}")
            
            # Update the listing's images array in the database
            if DB_ENABLED and image_url:
                try:
                    # Get current listing to retrieve existing images
                    current_listing = get_listing_by_id(listing_id)
                    if not current_listing:
                        logging.warning(f"Listing {listing_id} not found, skipping database update")
                    else:
                        existing_images = current_listing.images or []
                        
                        # Append the new image URL if it's not already in the list
                        if image_url not in existing_images:
                            updated_images = list(existing_images) + [image_url]
                            
                            # Update the listing in the database
                            with get_db_connection() as conn:
                                if conn:
                                    with conn.cursor() as cur:
                                        cur.execute(
                                            "UPDATE listings SET images = %s, updated_at = now(), updated_by = %s WHERE id = %s",
                                            (updated_images, str(current_user.id), listing_id)
                                        )
                                        conn.commit()
                                        logging.info(f"Successfully updated images array for listing {listing_id}")
                        else:
                            logging.info(f"Image URL already exists in listing {listing_id}, skipping update")
                        
                except Exception as db_error:
                    # Log the error but don't fail the upload - the image is already in blob storage
                    logging.error(f"Failed to update listing images in database: {str(db_error)}")
                    logging.error(f"Traceback: {traceback.format_exc()}")
            
            return {
                "url": image_url,
                "filename": unique_filename,
                "path": blob_path,
                "listing_id": listing_id
            }
            
        except requests.exceptions.RequestException as req_error:
            logging.error(f"Request error during Vercel Blob upload: {str(req_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"Network error during upload: {str(req_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error uploading image for listing {listing_id}: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

@listing_management_router.delete("/{listing_id}/images")
async def delete_listing_image(
    listing_id: int = Path(..., description="ID of the listing"),
    image_url: str = Query(..., description="URL of the image to delete"),
    current_user: UserOut = Depends(get_current_user)
):
    """Delete an image from a listing and remove it from Vercel Blob storage"""
    try:
        # Get current listing to verify it exists and get current images
        current_listing = get_listing_by_id(listing_id)
        if not current_listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Check if the image exists in the listing
        current_images = current_listing.images or []
        if image_url not in current_images:
            raise HTTPException(status_code=404, detail="Image not found in listing")
        
        # Delete from Vercel Blob storage
        blob_deleted = delete_blob_from_vercel(image_url)
        if not blob_deleted:
            logging.warning(f"Failed to delete blob from Vercel, but continuing with database update: {image_url}")
        
        # Remove from database
        if DB_ENABLED:
            try:
                updated_images = [img for img in current_images if img != image_url]
                
                with get_db_connection() as conn:
                    if conn:
                        with conn.cursor() as cur:
                            cur.execute(
                                "UPDATE listings SET images = %s, updated_at = now(), updated_by = %s WHERE id = %s",
                                (updated_images, str(current_user.id), listing_id)
                            )
                            conn.commit()
                            logging.info(f"Successfully removed image from listing {listing_id}")
            except Exception as db_error:
                logging.error(f"Failed to update listing images in database: {str(db_error)}")
                raise HTTPException(status_code=500, detail="Failed to update listing in database")
        
        return {
            "message": "Image deleted successfully",
            "listing_id": listing_id,
            "image_url": image_url,
            "blob_deleted": blob_deleted
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting image for listing {listing_id}: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")

# ==============================================
# AI SCORING ENDPOINTS
# ==============================================

@listing_management_router.post("/{listing_id}/score")
def calculate_listing_score_ai(
    listing_id: int = Path(..., description="ID of the listing to score"),
    current_user: UserOut = Depends(get_current_user)
):
    """Calculate AI-based score for a listing using all listing fields and contact information"""
    try:
        # Get listing details
        listing = get_listing_by_id(listing_id)
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Convert listing to dictionary format for scoring
        # Resolve adjusted MMR from mmr_data table (falls back to listing.mmr if no DB record)
        resolved_mmr = listing.mmr
        if listing.vin:
            try:
                db_mmr = get_adjusted_mmr_for_vin(
                    listing.vin.strip().upper(),
                    int(listing.miles) if listing.miles is not None else None
                )
                if db_mmr:
                    resolved_mmr = db_mmr
                    logging.info(f"Rescore: using adjusted MMR {db_mmr} for VIN {listing.vin}")
            except Exception as _mmr_err:
                logging.warning(f"Rescore: could not fetch adjusted MMR for VIN {listing.vin}: {_mmr_err}")

        listing_data = {
            "year": listing.year,
            "make": listing.make,
            "model": listing.model,
            "trim": listing.trim,
            "vin": listing.vin,
            "price": listing.price,
            "mmr": resolved_mmr,
            "miles": listing.miles,
            "dom": listing.dom,
            "condition": listing.condition,
            "overallRating": listing.overallRating,
            "detailedRatings": listing.detailedRatings,
            "cleanTitle": listing.cleanTitle,
            "bodyStyle": listing.bodyStyle,
            "transmission": listing.transmission,
            "fuelType": listing.fuelType,
            "driveType": listing.driveType,
            "engine": listing.engine,
            "mpg": listing.mpg,
            "exteriorColor": listing.exteriorColor,
            "interiorColor": listing.interiorColor,
            "location": listing.location,
            "source": listing.source,
            "sellerName": listing.sellerName,
            "phoneNumber": listing.phoneNumber,
            "sellerDescription": listing.sellerDescription,
            "sellerJoinedDate": listing.sellerJoinedDate,
            "paidStatus": listing.paidStatus,
            "notes": listing.notes
        }
        
        # Calculate score using AI
        score_result = calculate_listing_score(listing_data)
        
        # Update score in database
        if listing.vin and listing.vehicle_key:
            vin_key = listing.vin.strip().upper()
            update_score(listing.vehicle_key, vin_key, score_result["score"], score_result["buyMax"], score_result["reasonCodes"])
            update_cached_score(vin_key, score_result["score"], score_result["buyMax"], score_result["reasonCodes"])
        
        return {
            "score": score_result["score"],
            "buyMax": score_result["buyMax"],
            "reasonCodes": score_result["reasonCodes"],
            "listing_id": listing_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error calculating AI score for listing {listing_id}: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate score: {str(e)}")


@listing_management_router.post("/score-all")
def score_all_listings(
    current_user: UserOut = Depends(get_current_user)
):
    """
    Batch re-score every listing in the database.
    Returns a summary: total, scored, skipped, failed counts plus per-listing results.
    """
    try:
        listings = list_listings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch listings: {str(e)}")

    results = []
    scored = 0
    skipped = 0
    failed = 0

    for listing in listings:
        entry = {"listing_id": listing.id, "status": None}
        try:
            # Resolve adjusted MMR from mmr_data table
            resolved_mmr = listing.mmr
            if listing.vin:
                try:
                    db_mmr = get_adjusted_mmr_for_vin(
                        listing.vin.strip().upper(),
                        int(listing.miles) if listing.miles is not None else None
                    )
                    if db_mmr:
                        resolved_mmr = db_mmr
                except Exception as _mmr_err:
                    logging.warning(f"score-all: could not fetch adjusted MMR for VIN {listing.vin}: {_mmr_err}")

            listing_data = {
                "year": listing.year,
                "make": listing.make,
                "model": listing.model,
                "trim": listing.trim,
                "vin": listing.vin,
                "price": listing.price,
                "mmr": resolved_mmr,
                "miles": listing.miles,
                "dom": listing.dom,
                "condition": listing.condition,
                "overallRating": listing.overallRating,
                "detailedRatings": listing.detailedRatings,
                "cleanTitle": listing.cleanTitle,
                "bodyStyle": listing.bodyStyle,
                "transmission": listing.transmission,
                "fuelType": listing.fuelType,
                "driveType": listing.driveType,
                "engine": listing.engine,
                "mpg": listing.mpg,
                "exteriorColor": listing.exteriorColor,
                "interiorColor": listing.interiorColor,
                "location": listing.location,
                "source": listing.source,
                "sellerName": listing.sellerName,
                "phoneNumber": listing.phoneNumber,
                "sellerDescription": listing.sellerDescription,
                "sellerJoinedDate": listing.sellerJoinedDate,
                "paidStatus": listing.paidStatus,
                "notes": listing.notes,
            }

            score_result = calculate_listing_score(listing_data)

            if listing.vin and listing.vehicle_key:
                vin_key = listing.vin.strip().upper()
                update_score(listing.vehicle_key, vin_key, score_result["score"], score_result["buyMax"], score_result["reasonCodes"])
                update_cached_score(vin_key, score_result["score"], score_result["buyMax"], score_result["reasonCodes"])
                entry["status"] = "scored"
                entry["score"] = score_result["score"]
                entry["buyMax"] = score_result["buyMax"]
                entry["reasonCodes"] = score_result["reasonCodes"]
                scored += 1
            else:
                entry["status"] = "skipped"
                entry["reason"] = "missing vin or vehicle_key"
                skipped += 1

        except Exception as e:
            logging.error(f"score-all: failed listing {listing.id}: {str(e)}")
            entry["status"] = "failed"
            entry["error"] = str(e)
            failed += 1

        results.append(entry)

    return {
        "total": len(listings),
        "scored": scored,
        "skipped": skipped,
        "failed": failed,
        "results": results,
    }
