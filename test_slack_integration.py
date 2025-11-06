#!/usr/bin/env python3
"""
Test script for Slack integration
Run this to test the Slack notification functionality
"""

import os
import sys
import json
from datetime import datetime, timezone

# Add the api directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

from api.services.slack_service import SlackService
from api.schemas.listing import ListingOut, Decision

def create_test_listing():
    """Create a test listing for Slack notification"""
    return ListingOut(
        id="test-123",
        vehicle_key="TEST123456789",
        vin="1HGBH41JXMN109186",
        year=2020,
        make="Honda",
        model="Civic",
        trim="LX",
        miles=45000,
        price=18500.00,
        score=85,
        dom=7,
        source="AutoTrader",
        radius=25,
        reasonCodes=["Good condition", "Low mileage", "Popular model"],
        buyMax=17500.00,
        status="approved",
        location="Los Angeles, CA",
        buyer_id="buyer-123",
        buyer_username="test_buyer",
        created_at=datetime.now(timezone.utc).isoformat(),
        decision=Decision(
            buyMax=17500.00,
            status="approved",
            reasons=["Good condition", "Low mileage", "Popular model"]
        )
    )

def test_slack_service():
    """Test the Slack service"""
    print("🧪 Testing Slack Service...")
    
    # Check if Slack is configured
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        print("❌ SLACK_WEBHOOK_URL not configured. Set it in your environment or .env file")
        print("   Example: export SLACK_WEBHOOK_URL='https://hooks.slack.com/services/YOUR/WEBHOOK/URL'")
        return False
    
    print(f"✅ Slack webhook URL configured: {webhook_url[:50]}...")
    
    # Create test listing
    test_listing = create_test_listing()
    print(f"✅ Created test listing: {test_listing.year} {test_listing.make} {test_listing.model}")
    
    # Test Slack service
    slack_service = SlackService()
    
    if not slack_service.enabled:
        print("❌ Slack service is disabled. Check your configuration.")
        return False
    
    print("✅ Slack service is enabled")
    
    # Send test notification
    print("📤 Sending test notification to Slack...")
    result = slack_service.send_notification(test_listing, "This is a test notification from the auto-buyer system")
    
    if result.sent:
        print(f"✅ Notification sent successfully to {result.channel}")
        print(f"   Message: {result.message}")
        return True
    else:
        print(f"❌ Failed to send notification: {result.error}")
        return False

def test_slack_payload():
    """Test the Slack payload creation without sending"""
    print("\n🧪 Testing Slack Payload Creation...")
    
    test_listing = create_test_listing()
    slack_service = SlackService()
    
    # Create payload without sending
    payload = slack_service._create_slack_payload(test_listing, "Test custom message")
    
    print("✅ Slack payload created successfully")
    print(f"   Channel: {payload['channel']}")
    print(f"   Text: {payload['text']}")
    print(f"   Blocks count: {len(payload['blocks'])}")
    
    # Print the payload structure
    print("\n📋 Payload structure:")
    for i, block in enumerate(payload['blocks']):
        print(f"   Block {i+1}: {block['type']}")
        if block['type'] == 'section' and 'fields' in block:
            print(f"     Fields: {len(block['fields'])}")
    
    return True

if __name__ == "__main__":
    print("🚀 Slack Integration Test")
    print("=" * 50)
    
    # Test payload creation first
    test_slack_payload()
    
    # Test actual sending (only if webhook is configured)
    if os.getenv("SLACK_WEBHOOK_URL"):
        test_slack_service()
    else:
        print("\n⚠️  Skipping actual Slack notification test (no webhook URL)")
        print("   To test actual notifications, set SLACK_WEBHOOK_URL environment variable")
    
    print("\n✅ Test completed!")
