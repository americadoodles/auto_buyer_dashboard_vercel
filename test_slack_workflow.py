#!/usr/bin/env python3
"""
Test script for Slack workflow integration
"""

import os
import sys
import json
from pathlib import Path

# Add the api directory to the Python path
sys.path.append(str(Path(__file__).parent / "api"))

from services.slack_workflow_service import slack_workflow_service
from schemas.listing import ListingOut

def create_test_listing():
    """Create a test listing for workflow testing"""
    return ListingOut(
        id="test-listing-123",
        vehicle_key="TEST_VEHICLE_001",
        vin="1HGBH41JXMN109186",
        year=2020,
        make="Honda",
        model="Civic",
        miles=45000,
        price=18500.00,
        score=85,
        dom=12,
        source="https://example.com/listing",
        radius=50,
        buyMax=20000.00,
        status="pending",
        location="San Francisco, CA",
        buyer_id="buyer_123",
        buyer_username="test_buyer"
    )

def test_workflow_payload():
    """Test the workflow payload creation"""
    print("🧪 Testing Slack Workflow Payload Creation")
    print("=" * 50)
    
    listing = create_test_listing()
    
    # Test webhook payload
    webhook_payload = slack_workflow_service._create_workflow_webhook_payload(listing, "Test custom message")
    
    print("📋 Webhook Payload Structure:")
    print(f"  - Text: {webhook_payload.get('text', 'N/A')}")
    print(f"  - Attachments: {len(webhook_payload.get('attachments', []))} attachment(s)")
    print(f"  - Data Variables: {len([k for k in webhook_payload.keys() if not k.startswith(('text', 'attachments'))])} variables")
    
    print("\n📊 Key Data Variables:")
    key_vars = ['lead_source', 'vehicle_year_make_model', 'vin', 'mileage', 'condition', 
                'estimated_price_offer', 'urgency_level', 'main_contact', 'score', 'dom']
    for var in key_vars:
        if var in webhook_payload:
            print(f"  - {var}: {webhook_payload[var]}")
    
    print("\n🔧 Configuration Check:")
    print(f"  - Workflow Enabled: {slack_workflow_service.enabled}")
    print(f"  - Bot Token Configured: {bool(slack_workflow_service.bot_token)}")
    print(f"  - Webhook URL Configured: {bool(slack_workflow_service.workflow_webhook_url)}")
    
    if not slack_workflow_service.enabled:
        print("\n⚠️  Workflow integration is disabled. Set SLACK_WORKFLOW_ENABLED=true in your .env file")
    
    if not slack_workflow_service.workflow_webhook_url:
        print("\n⚠️  No workflow webhook URL configured. Set SLACK_WORKFLOW_WEBHOOK_URL in your .env file")
    
    if not slack_workflow_service.bot_token:
        print("\n⚠️  No bot token configured. Set SLACK_BOT_TOKEN in your .env file")
    
    return webhook_payload

def test_workflow_trigger():
    """Test the actual workflow trigger (if configured)"""
    print("\n🚀 Testing Workflow Trigger")
    print("=" * 50)
    
    if not slack_workflow_service.enabled:
        print("❌ Workflow integration is disabled")
        return
    
    listing = create_test_listing()
    
    try:
        result = slack_workflow_service.trigger_workflow(listing, "Test workflow trigger")
        
        print(f"✅ Workflow Trigger Result:")
        print(f"  - Triggered: {result.triggered}")
        print(f"  - Message: {result.message}")
        if result.workflow_id:
            print(f"  - Workflow ID: {result.workflow_id}")
        if result.error:
            print(f"  - Error: {result.error}")
            
    except Exception as e:
        print(f"❌ Error testing workflow trigger: {str(e)}")

def main():
    """Main test function"""
    print("🔧 Slack Workflow Integration Test")
    print("=" * 50)
    
    # Test payload creation
    payload = test_workflow_payload()
    
    # Test workflow trigger (if configured)
    test_workflow_trigger()
    
    print("\n📝 Next Steps:")
    print("1. Configure your Slack workflow with the variables listed above")
    print("2. Set SLACK_WORKFLOW_WEBHOOK_URL in your .env file")
    print("3. Set SLACK_WORKFLOW_ENABLED=true in your .env file")
    print("4. Test the workflow trigger from the web interface")
    
    print("\n💡 Workflow Setup Tips:")
    print("- In your Slack workflow, add variables for each data field")
    print("- Use the variables in your workflow steps like {{vehicle_year_make_model}}")
    print("- The webhook will send both formatted message and raw data variables")

if __name__ == "__main__":
    main()
