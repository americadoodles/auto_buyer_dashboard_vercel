import requests
import json
import logging
from typing import Optional, Dict, Any
from ..core.config import settings
from ..schemas.slack import SlackLeadData, SlackNotificationRequest, SlackNotificationResponse
from ..schemas.listing import ListingOut

logger = logging.getLogger(__name__)

class SlackService:
    """Service for sending notifications to Slack using webhooks"""
    
    def __init__(self):
        self.webhook_url = settings.SLACK_WEBHOOK_URL
        self.channel = settings.SLACK_CHANNEL
        self.enabled = settings.SLACK_ENABLED and bool(self.webhook_url)
    
    def _format_vehicle_type(self, make: str, model: str, year: int) -> str:
        """Format vehicle type for Slack"""
        return f"{year} {make} {model}".strip()
    
    def _determine_condition(self, miles: int, dom: int) -> str:
        """Determine vehicle condition based on miles and days on market"""
        if miles < 50000:
            return "Excellent"
        elif miles < 100000:
            return "Good"
        elif miles < 150000:
            return "Fair"
        else:
            return "Poor"
    
    def _determine_urgency(self, dom: int, score: Optional[int]) -> str:
        """Determine urgency level based on days on market and score"""
        if dom <= 7:
            return "High"
        elif dom <= 14:
            return "Medium"
        else:
            return "Low"
    
    def _create_slack_payload(self, listing: ListingOut, custom_message: Optional[str] = None) -> Dict[str, Any]:
        """Create Slack webhook payload using the new_leads template format"""
        
        # Map listing data to Slack template fields
        lead_data = SlackLeadData(
            lead_source=listing.source or "Auto Buyer System",
            vehicle_type="Vehicle",  # Generic type
            vehicle_year_make_model=self._format_vehicle_type(listing.make, listing.model, listing.year),
            mileage=listing.miles,
            condition=self._determine_condition(listing.miles, listing.dom),
            estimated_price_offer=listing.price,
            urgency_level=self._determine_urgency(listing.dom, listing.score),
            main_contact=listing.buyer_username or "Unknown Buyer",
            vin=listing.vin or "N/A",
            clear_carfax="Unknown",  # Not available in current data
            clean_autocheck="Unknown",  # Not available in current data
            mmr_price=listing.buyMax if listing.buyMax else None,
            distance=listing.location or "Unknown",
            image_url=None  # Not available in current data
        )
        
        # Create Slack message blocks - split into multiple sections to avoid field limit
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "🚗 New Vehicle Lead"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Lead Source:*\n{lead_data.lead_source}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Vehicle Type:*\n{lead_data.vehicle_type}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Vehicle Year/Make/Model:*\n{lead_data.vehicle_year_make_model}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Mileage:*\n{lead_data.mileage:,} miles"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Condition:*\n{lead_data.condition}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Estimated Price/Offer:*\n${lead_data.estimated_price_offer:,.2f}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Urgency Level:*\n{lead_data.urgency_level}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Main Contact:*\n{lead_data.main_contact}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*VIN:*\n{lead_data.vin}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Clear Carfax:*\n{lead_data.clear_carfax}"
                    }
                ]
            }
        ]
        
        # Add second section for additional fields to avoid field limit
        additional_fields = []
        
        # Add Clean Autocheck
        additional_fields.append({
            "type": "mrkdwn",
            "text": f"*Clean Autocheck:*\n{lead_data.clean_autocheck}"
        })
        
        # Add MMR price if available
        if lead_data.mmr_price:
            additional_fields.append({
                "type": "mrkdwn",
                "text": f"*MMR Price:*\n${lead_data.mmr_price:,.2f}"
            })
        
        # Add distance if available
        if lead_data.distance:
            additional_fields.append({
                "type": "mrkdwn",
                "text": f"*Distance:*\n{lead_data.distance}"
            })
        
        # Add second section if we have additional fields
        if additional_fields:
            blocks.append({
                "type": "section",
                "fields": additional_fields
            })
        
        # Add custom message if provided
        if custom_message:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Additional Notes:*\n{custom_message}"
                }
            })
        
        return {
            "channel": self.channel,
            "blocks": blocks,
            "text": f"New vehicle lead: {lead_data.vehicle_year_make_model}"
        }
    
    def send_notification(self, listing: ListingOut, custom_message: Optional[str] = None) -> SlackNotificationResponse:
        """Send notification to Slack channel"""
        
        if not self.enabled:
            return SlackNotificationResponse(
                vehicle_key=listing.vehicle_key,
                vin=listing.vin or "",
                sent=False,
                channel=self.channel,
                message="Slack notifications disabled",
                error="Slack webhook URL not configured"
            )
        
        try:
            payload = self._create_slack_payload(listing, custom_message)
            
            # Log payload for debugging (remove in production)
            logger.debug(f"Slack payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(
                self.webhook_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully sent Slack notification for VIN {listing.vin}")
                return SlackNotificationResponse(
                    vehicle_key=listing.vehicle_key,
                    vin=listing.vin or "",
                    sent=True,
                    channel=self.channel,
                    message="Notification sent successfully"
                )
            else:
                error_msg = response.text
                logger.error(f"Slack webhook failed with status {response.status_code}: {error_msg}")
                
                # Provide more specific error messages
                if response.status_code == 400:
                    if "invalid_blocks" in error_msg:
                        error_msg = "Invalid Slack blocks structure - check field limits and formatting"
                    elif "channel_not_found" in error_msg:
                        error_msg = f"Slack channel '{self.channel}' not found or bot not added to channel"
                    elif "not_in_channel" in error_msg:
                        error_msg = f"Bot not in channel '{self.channel}' - add bot to channel first"
                
                return SlackNotificationResponse(
                    vehicle_key=listing.vehicle_key,
                    vin=listing.vin or "",
                    sent=False,
                    channel=self.channel,
                    message="Failed to send notification",
                    error=f"HTTP {response.status_code}: {error_msg}"
                )
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Slack webhook request failed: {str(e)}")
            return SlackNotificationResponse(
                vehicle_key=listing.vehicle_key,
                vin=listing.vin or "",
                sent=False,
                channel=self.channel,
                message="Failed to send notification",
                error=str(e)
            )
        except Exception as e:
            logger.error(f"Unexpected error sending Slack notification: {str(e)}")
            return SlackNotificationResponse(
                vehicle_key=listing.vehicle_key,
                vin=listing.vin or "",
                sent=False,
                channel=self.channel,
                message="Failed to send notification",
                error=str(e)
            )

# Global instance
slack_service = SlackService()
