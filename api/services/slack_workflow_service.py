import requests
import json
import logging
from typing import Optional, Dict, Any, List
from ..core.config import settings
from ..schemas.slack import SlackWorkflowTriggerRequest, SlackWorkflowTriggerResponse
from ..schemas.listing import ListingOut

logger = logging.getLogger(__name__)

class SlackWorkflowService:
    """Service for triggering Slack workflows with auto-populated form data"""
    
    def __init__(self):
        self.bot_token = settings.SLACK_BOT_TOKEN
        self.workflow_webhook_url = settings.SLACK_WORKFLOW_WEBHOOK_URL
        self.enabled = settings.SLACK_WORKFLOW_ENABLED and bool(self.bot_token)
    
    def _format_vehicle_info(self, listing: ListingOut) -> str:
        """Format vehicle information for workflow forms"""
        return f"{listing.year} {listing.make} {listing.model}".strip()
    
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
    
    def _create_workflow_payload(self, listing: ListingOut, custom_message: Optional[str] = None) -> Dict[str, Any]:
        """Create workflow trigger payload with form data"""
        
        # Create a simple key-value payload that Slack can parse
        # Convert all values to strings for Slack compatibility
        payload = {
            "lead_source": str(listing.source or "Auto Buyer System"),
            "vehicle_type": "Vehicle",
            "vehicle_year_make_model": str(self._format_vehicle_info(listing)),
            "mileage": str(listing.miles),
            "condition": str(self._determine_condition(listing.miles, listing.dom)),
            "estimated_price_offer": str(listing.price),
            "urgency_level": str(self._determine_urgency(listing.dom, listing.score)),
            "main_contact": str(listing.buyer_username or "Unknown Buyer"),
            "vin": str(listing.vin or "N/A"),
            "clear_carfax": "Unknown",
            "clean_autocheck": "Unknown",
            "mmr_price": str(listing.buyMax) if listing.buyMax else "N/A",
            "distance": str(listing.location or "Unknown"),
            "vehicle_key": str(listing.vehicle_key),
            "listing_id": str(listing.id),
            "score": str(listing.score),
            "dom": str(listing.dom),
            "radius": str(listing.radius),
            "status": str(listing.status or "pending")
        }
        
        # Add custom message if provided
        if custom_message:
            payload["custom_notes"] = str(custom_message)
        
        return payload
    
    def _create_workflow_webhook_payload(self, listing: ListingOut, custom_message: Optional[str] = None) -> Dict[str, Any]:
        """Create webhook payload specifically for Slack workflow webhooks"""
        
        # For Slack workflow webhooks, we need to send data in a specific format
        # that matches the workflow's expected input variables
        return {
            "text": f"New Vehicle Lead: {self._format_vehicle_info(listing)}",
            "attachments": [
                {
                    "color": "good",
                    "fields": [
                        {
                            "title": "Vehicle Information",
                            "value": f"**{self._format_vehicle_info(listing)}**\nVIN: {listing.vin or 'N/A'}\nMileage: {listing.miles:,} miles\nPrice: ${listing.price:,.2f}",
                            "short": False
                        },
                        {
                            "title": "Lead Details",
                            "value": f"**Source:** {listing.source or 'Auto Buyer System'}\n**Contact:** {listing.buyer_username or 'Unknown Buyer'}\n**Location:** {listing.location or 'Unknown'}\n**Condition:** {self._determine_condition(listing.miles, listing.dom)}",
                            "short": False
                        },
                        {
                            "title": "Business Data",
                            "value": f"**Score:** {listing.score}\n**Days on Market:** {listing.dom}\n**Urgency:** {self._determine_urgency(listing.dom, listing.score)}\n**Status:** {listing.status or 'pending'}",
                            "short": False
                        }
                    ]
                }
            ],
            # Include all the data as simple key-value pairs for workflow processing
            "lead_source": str(listing.source or "Auto Buyer System"),
            "vehicle_type": "Vehicle",
            "vehicle_year_make_model": str(self._format_vehicle_info(listing)),
            "mileage": str(listing.miles),
            "condition": str(self._determine_condition(listing.miles, listing.dom)),
            "estimated_price_offer": str(listing.price),
            "urgency_level": str(self._determine_urgency(listing.dom, listing.score)),
            "main_contact": str(listing.buyer_username or "Unknown Buyer"),
            "vin": str(listing.vin or "N/A"),
            "clear_carfax": "Unknown",
            "clean_autocheck": "Unknown",
            "mmr_price": str(listing.buyMax) if listing.buyMax else "N/A",
            "distance": str(listing.location or "Unknown"),
            "vehicle_key": str(listing.vehicle_key),
            "listing_id": str(listing.id),
            "score": str(listing.score),
            "dom": str(listing.dom),
            "radius": str(listing.radius),
            "status": str(listing.status or "pending")
        }
    
    def trigger_workflow(self, listing: ListingOut, custom_message: Optional[str] = None) -> SlackWorkflowTriggerResponse:
        """Trigger a Slack workflow with auto-populated form data"""
        
        if not self.enabled:
            return SlackWorkflowTriggerResponse(
                vehicle_key=listing.vehicle_key,
                vin=listing.vin or "",
                triggered=False,
                workflow_id=None,
                message="Slack workflow integration disabled",
                error="Slack bot token not configured"
            )
        
        try:
            # Method 1: Use workflow webhook if configured (preferred for Slack workflows)
            if self.workflow_webhook_url:
                payload = self._create_workflow_webhook_payload(listing, custom_message)
                
                # Log payload for debugging (remove in production)
                logger.debug(f"Slack workflow webhook payload: {json.dumps(payload, indent=2)}")
                
                response = requests.post(
                    self.workflow_webhook_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
            else:
                # Method 2: Use Slack Web API to send a message with structured data
                headers = {
                    "Authorization": f"Bearer {self.bot_token}",
                    "Content-Type": "application/json"
                }
                
                # Create a structured message with the data
                message_blocks = [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": "🚗 New Vehicle Lead - Workflow Trigger"
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": f"*Vehicle:* {payload['vehicle_year_make_model']}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*VIN:* {payload['vin']}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Price:* ${payload['estimated_price_offer']}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Mileage:* {payload['mileage']} miles"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Condition:* {payload['condition']}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Urgency:* {payload['urgency_level']}"
                            }
                        ]
                    },
                    {
                        "type": "section",
                        "fields": [
                            {
                                "type": "mrkdwn",
                                "text": f"*Contact:* {payload['main_contact']}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Location:* {payload['distance']}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Score:* {payload['score']}"
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Days on Market:* {payload['dom']}"
                            }
                        ]
                    }
                ]
                
                # Add custom notes if provided
                if custom_message:
                    message_blocks.append({
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*Custom Notes:* {custom_message}"
                        }
                    })
                
                # Send to Slack channel
                response = requests.post(
                    "https://slack.com/api/chat.postMessage",
                    json={
                        "channel": settings.SLACK_CHANNEL,
                        "blocks": message_blocks,
                        "text": f"New vehicle lead: {payload['vehicle_year_make_model']}"
                    },
                    headers=headers,
                    timeout=10
                )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    logger.info(f"Successfully triggered Slack workflow for VIN {listing.vin}")
                    return SlackWorkflowTriggerResponse(
                        vehicle_key=listing.vehicle_key,
                        vin=listing.vin or "",
                        triggered=True,
                        workflow_id=result.get("workflow_id"),
                        message="Workflow triggered successfully"
                    )
                else:
                    error_msg = result.get("error", "Unknown error")
                    logger.error(f"Slack workflow trigger failed: {error_msg}")
                    return SlackWorkflowTriggerResponse(
                        vehicle_key=listing.vehicle_key,
                        vin=listing.vin or "",
                        triggered=False,
                        workflow_id=None,
                        message="Failed to trigger workflow",
                        error=error_msg
                    )
            else:
                error_msg = response.text
                logger.error(f"Slack workflow trigger failed with status {response.status_code}: {error_msg}")
                return SlackWorkflowTriggerResponse(
                    vehicle_key=listing.vehicle_key,
                    vin=listing.vin or "",
                    triggered=False,
                    workflow_id=None,
                    message="Failed to trigger workflow",
                    error=f"HTTP {response.status_code}: {error_msg}"
                )
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Slack workflow trigger request failed: {str(e)}")
            return SlackWorkflowTriggerResponse(
                vehicle_key=listing.vehicle_key,
                vin=listing.vin or "",
                triggered=False,
                workflow_id=None,
                message="Failed to trigger workflow",
                error=str(e)
            )
        except Exception as e:
            logger.error(f"Unexpected error triggering Slack workflow: {str(e)}")
            return SlackWorkflowTriggerResponse(
                vehicle_key=listing.vehicle_key,
                vin=listing.vin or "",
                triggered=False,
                workflow_id=None,
                message="Failed to trigger workflow",
                error=str(e)
            )
    
    def trigger_batch_workflows(self, listings: List[ListingOut], custom_message: Optional[str] = None) -> List[SlackWorkflowTriggerResponse]:
        """Trigger workflows for multiple listings"""
        results = []
        for listing in listings:
            result = self.trigger_workflow(listing, custom_message)
            results.append(result)
        return results

# Global instance
slack_workflow_service = SlackWorkflowService()
