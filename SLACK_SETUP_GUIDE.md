# Slack Integration Setup Guide

This guide will help you set up Slack notifications and workflow triggers for vehicle listings in your auto-buyer system.

## Prerequisites

- A Slack workspace where you have admin permissions
- Access to create Slack apps and webhooks
- Your auto-buyer system running

## Step 1: Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter app name: `Auto Buyer Notifications`
5. Select your workspace
6. Click **"Create App"**

## Step 2: Configure Incoming Webhooks

1. In your app settings, go to **"Incoming Webhooks"**
2. Toggle **"Activate Incoming Webhooks"** to **On**
3. Click **"Add New Webhook to Workspace"**
4. Select the channel `#leads-inbox` (or create it if it doesn't exist)
5. Click **"Allow"**
6. Copy the **Webhook URL** (starts with `https://hooks.slack.com/services/...`)

## Step 3: Configure Environment Variables

Add these variables to your `.env` file:

```env
# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#leads-inbox
SLACK_ENABLED=true

# Slack Workflow Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_WORKFLOW_WEBHOOK_URL=https://hooks.slack.com/workflows/YOUR/WORKFLOW/URL
SLACK_WORKFLOW_STEP_ID=your-workflow-step-id
SLACK_WORKFLOW_ENABLED=true
```

## Step 4: Install Dependencies

The system already includes the required dependencies in `requirements.txt`:
- `requests==2.31.0` (for HTTP requests to Slack)

Install them with:
```bash
pip install -r requirements.txt
```

## Step 5: Test the Integration

Run the test script to verify everything works:

```bash
python test_slack_integration.py
```

This will:
- ✅ Check if Slack is properly configured
- ✅ Create a test vehicle listing
- ✅ Send a test notification to your Slack channel
- ✅ Verify the message format matches your `new_leads` template

## Step 6: Setting Up Slack Workflows

### Create a Slack Workflow

1. In your Slack workspace, go to **Tools** → **Workflow Builder**
2. Click **"Create Workflow"**
3. Choose **"From a webhook"** as the trigger
4. **Configure the webhook trigger variables** to match our data format:
   - `lead_source` (Text)
   - `vehicle_type` (Text)
   - `vehicle_year_make_model` (Text)
   - `mileage` (Text)
   - `condition` (Text)
   - `estimated_price_offer` (Text)
   - `urgency_level` (Text)
   - `main_contact` (Text)
   - `vin` (Text)
   - `clear_carfax` (Text)
   - `clean_autocheck` (Text)
   - `mmr_price` (Text)
   - `distance` (Text)
   - `vehicle_key` (Text)
   - `listing_id` (Text)
   - `score` (Text)
   - `dom` (Text)
   - `radius` (Text)
   - `status` (Text)
   - `custom_notes` (Text, optional)
5. Configure your workflow steps (forms, approvals, notifications, etc.)
   - Use the variables in your workflow steps by referencing them like `{{lead_source}}`, `{{vehicle_year_make_model}}`, etc.
   - You can use these variables in forms, messages, and conditional logic
6. Copy the **Workflow Webhook URL** from your workflow
7. Add this to your `.env` file

### Using Workflow Variables in Slack

In your Slack workflow, you can reference the auto-populated data using these variable names:

- **Vehicle Info**: `{{vehicle_year_make_model}}`, `{{vin}}`, `{{mileage}}`, `{{condition}}`
- **Pricing**: `{{estimated_price_offer}}`, `{{mmr_price}}`
- **Business Logic**: `{{score}}`, `{{urgency_level}}`, `{{dom}}`, `{{status}}`
- **Contact**: `{{main_contact}}`, `{{lead_source}}`, `{{distance}}`
- **System Data**: `{{vehicle_key}}`, `{{listing_id}}`, `{{radius}}`
- **Custom**: `{{custom_notes}}` (if provided)

### Configure Bot Permissions

1. Go to your Slack app settings → **OAuth & Permissions**
2. Add these scopes:
   - `workflows:write` - Create and manage workflows
   - `workflows:read` - Read workflow information
   - `chat:write` - Send messages
   - `channels:read` - Read channel information
3. Click **"Reinstall to Workspace"**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

## Step 7: Using Slack Notifications and Workflows

### In the Web Interface

1. Navigate to the **Vehicle Listings** page
2. Find a vehicle listing you want to process
3. Choose your action:
   - **Bell icon** (🔔) - Send basic notification
   - **Send icon** (📤) - Send formatted Slack message
   - **Workflow icon** (⚡) - Trigger Slack workflow with auto-populated form

### API Endpoints

You can also send notifications and trigger workflows programmatically:

```bash
# Send single notification
curl -X POST "http://localhost:8001/api/slack/notify" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "vehicle_key": "VEHICLE_KEY",
    "vin": "VIN_NUMBER",
    "custom_message": "Optional custom message"
  }'

# Trigger Slack workflow
curl -X POST "http://localhost:8001/api/slack/trigger-workflow" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "vehicle_key": "VEHICLE_KEY",
    "vin": "VIN_NUMBER",
    "custom_message": "Optional custom message"
  }'

# Check Slack status
curl -X GET "http://localhost:8001/api/slack/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Message Format

### Slack Notifications
The Slack notifications will include all the fields from your `new_leads` template:

- **Lead Source**: Auto Buyer System
- **Vehicle Type**: Vehicle
- **Vehicle Year/Make/Model**: e.g., "2020 Honda Civic LX"
- **Mileage**: Formatted with commas
- **Condition**: Auto-determined based on mileage and DOM
- **Estimated Price/Offer**: Vehicle price
- **Urgency Level**: High/Medium/Low based on DOM and score
- **Main Contact**: Buyer username
- **VIN**: Vehicle identification number
- **Clear Carfax**: Unknown (not available in current data)
- **Clean Autocheck**: Unknown (not available in current data)
- **MMR Price**: Buy max price (if available)
- **Distance**: Vehicle location

### Slack Workflow Form Data
When triggering workflows, the system auto-populates forms with:

- **lead_source**: Auto Buyer System
- **vehicle_type**: Vehicle
- **vehicle_year_make_model**: e.g., "2020 Honda Civic LX"
- **mileage**: Vehicle mileage
- **condition**: Auto-determined condition
- **estimated_price_offer**: Vehicle price
- **urgency_level**: High/Medium/Low
- **main_contact**: Buyer username
- **vin**: Vehicle identification number
- **clear_carfax**: Unknown
- **clean_autocheck**: Unknown
- **mmr_price**: Buy max price (if available)
- **distance**: Vehicle location
- **vehicle_key**: Unique vehicle identifier
- **listing_id**: Database listing ID
- **score**: Vehicle score
- **dom**: Days on market
- **radius**: Search radius
- **status**: Listing status
- **custom_notes**: Optional custom message

## Troubleshooting

### Common Issues

1. **"Slack notifications disabled"**
   - Check that `SLACK_ENABLED=true` in your `.env` file
   - Verify `SLACK_WEBHOOK_URL` is set correctly

2. **"HTTP 404: Not Found"**
   - Verify your webhook URL is correct
   - Check that the Slack app is properly installed in your workspace

3. **"HTTP 403: Forbidden"**
   - The webhook URL may be invalid or expired
   - Recreate the webhook in your Slack app settings

4. **Messages not appearing in channel**
   - Check that the channel `#leads-inbox` exists
   - Verify the app has permission to post to that channel
   - Check the channel's notification settings

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=DEBUG
```

This will show detailed information about Slack API calls and responses.

## Security Notes

- Keep your webhook URL secret - it allows posting to your Slack channel
- Don't commit webhook URLs to version control
- Consider using environment-specific webhook URLs for different deployments
- Regularly rotate webhook URLs for security

## Customization

### Custom Message Templates

You can modify the message format by editing `api/services/slack_service.py`:

```python
def _create_slack_payload(self, listing: ListingOut, custom_message: Optional[str] = None):
    # Customize the message blocks here
    blocks = [
        # Your custom message format
    ]
```

### Additional Fields

To add more fields to the notification, update the `SlackLeadData` schema in `api/schemas/slack.py` and modify the payload creation logic.

## Support

If you encounter issues:

1. Check the test script output for specific error messages
2. Verify your Slack app configuration
3. Test with a simple webhook URL first
4. Check the application logs for detailed error information

The integration is designed to be robust and will gracefully handle failures without affecting the main application functionality.
