#!/usr/bin/env python3
"""
Debug script for Slack integration issues
This script helps identify and fix common Slack webhook problems
"""

import os
import sys
import json
import requests
from datetime import datetime, timezone

# Add the api directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

from api.services.slack_service import SlackService
from api.schemas.listing import ListingOut, Decision

def test_webhook_url():
    """Test if the webhook URL is accessible"""
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        print("❌ SLACK_WEBHOOK_URL not configured")
        return False
    
    # Test with a simple payload
    simple_payload = {
        "text": "Test message from auto-buyer system",
        "channel": "#test-notification"
    }
    
    try:
        response = requests.post(
            webhook_url,
            json=simple_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Webhook URL is working with simple payload")
            return True
        else:
            print(f"❌ Webhook failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Webhook request failed: {str(e)}")
        return False

def test_blocks_structure():
    """Test the blocks structure for common issues"""
    print("\n🧪 Testing Slack blocks structure...")
    
    # Create test listing
    test_listing = ListingOut(
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
    
    slack_service = SlackService()
    payload = slack_service._create_slack_payload(test_listing, "Test message")
    
    # Check for common issues
    issues = []
    
    # Check blocks count
    if len(payload.get('blocks', [])) > 50:
        issues.append("Too many blocks (max 50)")
    
    # Check each section for field limits
    for i, block in enumerate(payload.get('blocks', [])):
        if block.get('type') == 'section' and 'fields' in block:
            field_count = len(block['fields'])
            if field_count > 10:
                issues.append(f"Block {i+1} has {field_count} fields (max 10)")
            
            # Check field text length
            for j, field in enumerate(block['fields']):
                text = field.get('text', '')
                if len(text) > 3000:
                    issues.append(f"Block {i+1}, Field {j+1} text too long ({len(text)} chars, max 3000)")
    
    if issues:
        print("❌ Found issues with blocks structure:")
        for issue in issues:
            print(f"   - {issue}")
        return False
    else:
        print("✅ Blocks structure looks good")
        return True

def test_channel_access():
    """Test if the bot has access to the specified channel"""
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    channel = os.getenv("SLACK_CHANNEL", "#test-notification")
    
    if not webhook_url:
        print("❌ SLACK_WEBHOOK_URL not configured")
        return False
    
    # Test with channel-specific payload
    test_payload = {
        "text": f"Testing channel access to {channel}",
        "channel": channel
    }
    
    try:
        response = requests.post(
            webhook_url,
            json=test_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"✅ Bot has access to channel {channel}")
            return True
        elif response.status_code == 400:
            error_text = response.text.lower()
            if "channel_not_found" in error_text:
                print(f"❌ Channel {channel} not found - check channel name")
            elif "not_in_channel" in error_text:
                print(f"❌ Bot not in channel {channel} - add bot to channel first")
            else:
                print(f"❌ Channel access error: {response.text}")
            return False
        else:
            print(f"❌ Channel test failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Channel test failed: {str(e)}")
        return False

def main():
    """Run all debug tests"""
    print("🔍 Slack Integration Debug Tool")
    print("=" * 50)
    
    # Check environment variables
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    channel = os.getenv("SLACK_CHANNEL", "#test-notification")
    
    print(f"Webhook URL: {'✅ Configured' if webhook_url else '❌ Not configured'}")
    print(f"Channel: {channel}")
    print()
    
    # Run tests
    tests = [
        ("Webhook URL Test", test_webhook_url),
        ("Blocks Structure Test", test_blocks_structure),
        ("Channel Access Test", test_channel_access)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"🧪 {test_name}...")
        result = test_func()
        results.append((test_name, result))
        print()
    
    # Summary
    print("📊 Test Results:")
    print("-" * 30)
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    all_passed = all(result for _, result in results)
    if all_passed:
        print("\n🎉 All tests passed! Slack integration should work.")
    else:
        print("\n⚠️  Some tests failed. Check the issues above.")
        print("\n💡 Common solutions:")
        print("   1. Make sure SLACK_WEBHOOK_URL is correct")
        print("   2. Add the bot to the target channel")
        print("   3. Check channel name format (e.g., #channel-name)")
        print("   4. Verify bot permissions in Slack workspace")

if __name__ == "__main__":
    main()
