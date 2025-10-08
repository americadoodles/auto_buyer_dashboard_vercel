from fastapi import APIRouter, HTTPException, Depends
from typing import List
from ..schemas.slack import SlackNotificationRequest, SlackNotificationResponse
from ..schemas.user import UserOut
from ..core.auth import get_current_user
from ..services.slack_service import slack_service
from ..repositories.repositories import list_listings

# Create router for Slack notifications
slack_router = APIRouter(prefix="/slack", tags=["slack"])

@slack_router.post("/notify", response_model=SlackNotificationResponse)
async def send_slack_notification(
    request: SlackNotificationRequest,
    current_user: UserOut = Depends(get_current_user)
):
    """Send a vehicle listing notification to Slack"""
    
    # Find the listing by vehicle_key
    listings = list_listings(limit=1000)  # Get all listings to find the specific one
    listing = next((l for l in listings if l.vehicle_key == request.vehicle_key), None)
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Send notification to Slack
    result = slack_service.send_notification(listing, request.custom_message)
    
    return result

@slack_router.post("/notify-batch", response_model=List[SlackNotificationResponse])
async def send_batch_slack_notifications(
    requests: List[SlackNotificationRequest],
    current_user: UserOut = Depends(get_current_user)
):
    """Send multiple vehicle listing notifications to Slack"""
    
    # Get all listings
    listings = list_listings(limit=1000)
    listing_map = {l.vehicle_key: l for l in listings}
    
    results = []
    for request in requests:
        listing = listing_map.get(request.vehicle_key)
        if listing:
            result = slack_service.send_notification(listing, request.custom_message)
            results.append(result)
        else:
            results.append(SlackNotificationResponse(
                vehicle_key=request.vehicle_key,
                vin=request.vin,
                sent=False,
                channel=slack_service.channel,
                message="Listing not found",
                error="Listing not found"
            ))
    
    return results

@slack_router.get("/status")
async def get_slack_status():
    """Get Slack integration status"""
    return {
        "enabled": slack_service.enabled,
        "webhook_configured": bool(slack_service.webhook_url),
        "channel": slack_service.channel
    }
