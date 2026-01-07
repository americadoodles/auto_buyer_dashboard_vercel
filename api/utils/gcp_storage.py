"""
Google Cloud Storage utility functions for uploading images
"""
import logging
import uuid
import requests
from typing import Optional, List
import json
import os

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


def upload_image_to_gcp(image_url_or_data: str, listing_id: Optional[str] = None, vin: Optional[str] = None) -> Optional[str]:
    """
    Upload an image to GCP Storage.
    
    Args:
        image_url_or_data: Either a URL to download the image from, or base64 data URI
        listing_id: Optional listing ID for organizing images
        vin: Optional VIN for organizing images
    
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
    
    # Create folder structure: listings/{listing_id or vin}/{filename}
    if listing_id:
        blob_path = f"listings/{listing_id}/{unique_filename}"
    elif vin:
        blob_path = f"listings/vin/{vin}/{unique_filename}"
    else:
        blob_path = f"listings/{unique_filename}"
    
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


def upload_images_to_gcp(images: List[str], listing_id: Optional[str] = None, vin: Optional[str] = None) -> List[str]:
    """
    Upload multiple images to GCP Storage.
    
    Args:
        images: List of image URLs or data URIs
        listing_id: Optional listing ID for organizing images
        vin: Optional VIN for organizing images
    
    Returns:
        List of public URLs of uploaded images (failed uploads are skipped)
    """
    if not images:
        return []
    
    uploaded_urls = []
    for image in images:
        if not image or not image.strip():
            continue
        
        uploaded_url = upload_image_to_gcp(image.strip(), listing_id, vin)
        if uploaded_url:
            uploaded_urls.append(uploaded_url)
        else:
            logging.warning(f"Failed to upload image, skipping: {image[:100]}")
    
    return uploaded_urls
