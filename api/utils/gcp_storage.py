"""
Google Cloud Storage utility functions for uploading images
"""
import logging
import uuid
import requests
from typing import Optional, List
import json
import os
import re
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from google.cloud import storage
    from google.oauth2 import service_account
    GCP_AVAILABLE = True
except ImportError:
    GCP_AVAILABLE = False
    logging.warning("google-cloud-storage not installed. GCP storage features will be disabled.")

from ..core.config import settings


def _get_gcp_client():
    """Get a GCP Storage client instance"""
    if not GCP_AVAILABLE:
        return None
    
    if not settings.GCP_STORAGE_ENABLED:
        return None
    
    if not settings.GCP_BUCKET_NAME:
        logging.warning("GCP_BUCKET_NAME not configured")
        return None
    
    try:
        # Try to get credentials from JSON string or file path
        credentials = None
        if settings.GCP_CREDENTIALS_JSON:
            try:
                # Try parsing as JSON string first
                creds_dict = json.loads(settings.GCP_CREDENTIALS_JSON)
                credentials = service_account.Credentials.from_service_account_info(creds_dict)
            except json.JSONDecodeError:
                # If not JSON, treat as file path
                if os.path.exists(settings.GCP_CREDENTIALS_JSON):
                    credentials = service_account.Credentials.from_service_account_file(
                        settings.GCP_CREDENTIALS_JSON
                    )
                else:
                    logging.warning(f"GCP credentials file not found: {settings.GCP_CREDENTIALS_JSON}")
        
        # If no explicit credentials, use default (from environment or metadata server)
        if credentials:
            client = storage.Client(credentials=credentials, project=settings.GCP_PROJECT_ID)
        else:
            client = storage.Client(project=settings.GCP_PROJECT_ID)
        
        return client
    except Exception as e:
        logging.error(f"Failed to initialize GCP Storage client: {str(e)}")
        return None


def _extract_source_name(source_url: Optional[str]) -> Optional[str]:
    """
    Extract a clean source name from a source URL.
    Examples:
        https://www.facebook.com/marketplace/... -> facebook
        https://www.carfax.com/vehicle/... -> carfax
        https://cars.com/... -> cars
    """
    if not source_url or not source_url.strip():
        return None
    
    try:
        # Parse the URL
        parsed = urlparse(source_url.strip().lower())
        domain = parsed.netloc or parsed.path
        
        # Remove www. prefix
        domain = re.sub(r'^www\.', '', domain)
        
        # Extract the main domain name (e.g., facebook.com -> facebook)
        # Handle cases like: facebook.com, www.facebook.com, m.facebook.com
        parts = domain.split('.')
        if len(parts) >= 2:
            # Get the main domain (second to last part, or last if only one)
            # facebook.com -> facebook
            # carfax.com -> carfax
            main_domain = parts[-2] if len(parts) > 1 else parts[0]
            
            # Common domain mappings
            domain_mappings = {
                'fb': 'facebook',
                'fbcom': 'facebook',
            }
            
            main_domain = domain_mappings.get(main_domain, main_domain)
            
            # Only allow alphanumeric and dash for folder names
            main_domain = re.sub(r'[^a-z0-9\-]', '', main_domain)
            
            return main_domain if main_domain else None
    except Exception as e:
        logging.warning(f"Failed to extract source name from {source_url}: {str(e)}")
        return None
    
    return None


def upload_image_to_gcp(image_url_or_data: str, listing_id: Optional[str] = None, vin: Optional[str] = None, source: Optional[str] = None) -> Optional[str]:
    """
    Upload an image to GCP Storage.
    
    Args:
        image_url_or_data: Either a URL to download the image from, or base64 data URI
        listing_id: Optional listing ID for organizing images
        vin: Optional VIN for organizing images (not used for folder structure)
        source: Source URL - used to determine folder structure (e.g., facebook, carfax)
    
    Returns:
        Public URL of the uploaded image, or None if upload failed
    """
    if not settings.GCP_STORAGE_ENABLED:
        logging.debug("GCP storage is disabled, skipping upload")
        return None
    
    client = _get_gcp_client()
    if not client:
        logging.warning("GCP client not available, skipping image upload")
        return None
    
    bucket_name = settings.GCP_BUCKET_NAME
    try:
        bucket = client.bucket(bucket_name)
    except Exception as e:
        logging.error(f"Failed to access GCP bucket {bucket_name}: {str(e)}")
        return None
    
    # Check if URL is already a GCP Storage URL - skip upload if so
    if "storage.googleapis.com" in image_url_or_data or "storage.cloud.google.com" in image_url_or_data:
        logging.debug(f"Image is already a GCP URL, skipping upload: {image_url_or_data[:100]}")
        return image_url_or_data
    
    # Download image data
    image_data = None
    content_type = "image/jpeg"
    
    try:
        # Check if it's a data URI (base64)
        if image_url_or_data.startswith("data:image/"):
            # Parse data URI: data:image/jpeg;base64,<data>
            header, data = image_url_or_data.split(",", 1)
            parts = header.split(";")
            if len(parts) > 0:
                content_type = parts[0].split(":")[1] if ":" in parts[0] else "image/jpeg"
            
            import base64
            image_data = base64.b64decode(data)
        elif image_url_or_data.startswith("http://") or image_url_or_data.startswith("https://"):
            # Download from URL
            response = requests.get(image_url_or_data, timeout=30, stream=True)
            response.raise_for_status()
            
            # Get content type from response headers
            content_type = response.headers.get("Content-Type", "image/jpeg")
            if not content_type.startswith("image/"):
                content_type = "image/jpeg"
            
            image_data = response.content
        else:
            # Assume it's already a GCP URL or some other format we should preserve
            logging.debug(f"Image appears to be a URL or already stored: {image_url_or_data}")
            return image_url_or_data
    except Exception as e:
        logging.error(f"Failed to download/process image from {image_url_or_data[:100]}: {str(e)}")
        return None
    
    if not image_data:
        logging.warning(f"No image data retrieved from {image_url_or_data[:100]}")
        return None
    
    # Validate image size (max 10MB)
    if len(image_data) > 10 * 1024 * 1024:
        logging.warning(f"Image too large ({len(image_data)} bytes), skipping upload")
        return None
    
    # Generate unique filename
    file_extension = ".jpg"
    if content_type:
        if "png" in content_type:
            file_extension = ".png"
        elif "gif" in content_type:
            file_extension = ".gif"
        elif "webp" in content_type:
            file_extension = ".webp"
    
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # Create folder structure: listings/{source_name}/{filename}
    # Organize by source name (e.g., facebook, carfax) extracted from source URL
    # Priority: source name > listing_id > generic folder
    source_name = _extract_source_name(source) if source else None
    
    if source_name:
        # Organize by source name: listings/facebook/uuid.jpg, listings/carfax/uuid.jpg
        blob_path = f"listings/{source_name}/{unique_filename}"
    elif listing_id:
        # Fallback to listing_id if source name cannot be extracted
        blob_path = f"listings/{listing_id}/{unique_filename}"
    else:
        # Fallback to generic folder if no source or listing_id
        blob_path = f"listings/unknown/{unique_filename}"
    
    try:
        # Upload to GCP
        blob = bucket.blob(blob_path)
        blob.upload_from_string(image_data, content_type=content_type)
        
        # Make blob publicly accessible
        # blob.make_public()
        
        # Get public URL
        public_url = blob.public_url
        
        logging.info(f"Successfully uploaded image to GCP: {public_url}")
        return public_url
    except Exception as e:
        logging.error(f"Failed to upload image to GCP: {str(e)}")
        return None


def upload_images_to_gcp(images: List[str], listing_id: Optional[str] = None, vin: Optional[str] = None, source: Optional[str] = None, max_workers: int = 5) -> List[str]:
    """
    Upload multiple images to GCP Storage in parallel (batch upload).
    
    Args:
        images: List of image URLs or data URIs
        listing_id: Optional listing ID for organizing images
        vin: Optional VIN for organizing images
        source: Optional source URL for organizing images when no VIN
        max_workers: Maximum number of concurrent upload threads (default: 5)
    
    Returns:
        List of public URLs of uploaded images (failed uploads are skipped)
    """
    if not images:
        return []
    
    # Filter out empty images
    valid_images = [img.strip() for img in images if img and img.strip()]
    
    if not valid_images:
        return []
    
    uploaded_urls = []
    failed_count = 0
    
    # Use ThreadPoolExecutor for parallel uploads
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all upload tasks
        future_to_image = {
            executor.submit(upload_image_to_gcp, image, listing_id, vin, source): image
            for image in valid_images
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_image):
            image = future_to_image[future]
            try:
                uploaded_url = future.result()
                if uploaded_url:
                    uploaded_urls.append(uploaded_url)
                else:
                    failed_count += 1
                    logging.warning(f"Failed to upload image, skipping: {image[:100]}")
            except Exception as e:
                failed_count += 1
                logging.error(f"Exception while uploading image {image[:100]}: {str(e)}")
    
    if failed_count > 0:
        logging.warning(f"Failed to upload {failed_count} out of {len(valid_images)} images")
    
    logging.info(f"Successfully uploaded {len(uploaded_urls)}/{len(valid_images)} images to GCP")
    return uploaded_urls
