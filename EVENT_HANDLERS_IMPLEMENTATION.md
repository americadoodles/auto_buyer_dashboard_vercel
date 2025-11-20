# Event Handlers & Automations Implementation

This document describes the implementation of the Event Handlers & Automations EPIC (CRM-TSK-020 through CRM-TSK-023).

## Overview

The implementation includes:
1. **Event Bus with Outbox Pattern** (CRM-TSK-020)
2. **Automation Rules** (CRM-TSK-021)
3. **SLA Scheduler** (CRM-TSK-022)
4. **Slack Notifications** (CRM-TSK-023)

## Architecture

### Event Bus & Outbox Pattern

The system uses a transactional outbox pattern for reliable event publishing:

- **Event Outbox Table**: Stores events in `event_outbox` table before processing
- **Event Bus Service**: Processes events from outbox and dispatches to subscribers
- **Event Types**: `LeadCreated`, `CommunicationLogged`, `DealCreated`, `DealStageChanged`

**Files:**
- `api/schemas/events.py` - Event schemas
- `api/repositories/event_outbox.py` - Outbox repository
- `api/services/event_bus.py` - Event bus service
- `db/007_event_outbox_schema.sql` - Database schema

### Automation Rules

Automation rules are triggered by events and create tasks automatically:

1. **LeadCreated** → Creates "First contact seller" task (Inbox column, due in 2h)
2. **CommunicationLogged (outbound)** → Marks "First contact seller" as Done; creates "Follow-up in 24h"
3. **CommunicationLogged (inbound)** → Creates "Reply to seller" task (due in 2h)
4. **DealCreated** → Creates "Prepare offer package" task (Negotiation column)

**Files:**
- `api/services/automation_service.py` - Automation rule handlers

### SLA Scheduler

Periodic jobs monitor SLA violations:

1. **Overdue Task Check**: Tags overdue tasks with "Overdue" tag and escalates to Slack
2. **No Response 48h Rule**: Creates "Escalate follow-up" task for leads with no response 48h after contact

**Files:**
- `api/services/sla_scheduler.py` - SLA monitoring service
- `api/services/background_jobs.py` - Background job scheduler

### Slack Notifications

Extended Slack service for task-related notifications:

1. **Task Notifications**: Sends notifications for overdue tasks
2. **Daily Digest**: Sends daily summary of tasks (overdue, due today, new tasks)

**Files:**
- `api/services/slack_service.py` - Extended with task notification methods

## Database Schema

### Event Outbox Table

```sql
CREATE TABLE event_outbox (
    id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ
);
```

### Task Tags Table

```sql
CREATE TABLE task_tags (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id),
    tag_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE(task_id, tag_name)
);
```

## Usage

### Running Migrations

Run the outbox schema migration:

```bash
psql $DATABASE_URL -f db/007_event_outbox_schema.sql
```

### Event Emission

Events are automatically emitted when:

1. **Lead Created**: When `create_lead()` is called in `api/repositories/crm_leads.py`
2. **Deal Created**: When `create_deal()` is called in `api/repositories/crm_deals.py`
3. **Deal Stage Changed**: When `update_deal()` changes the stage in `api/repositories/crm_deals.py`
4. **Communication Logged**: When `POST /api/crm/communications/` is called

### Background Jobs

Background jobs are automatically started when the FastAPI app starts (via `lifespan`):

- **Event Processor**: Runs every 10 seconds to process pending events
- **SLA Checker**: Runs every hour to check for overdue tasks and SLA violations
- **Daily Digest**: Runs once per day at 9 AM

### Manual Event Processing

You can manually trigger event processing:

```python
from api.services.event_bus import event_bus

# Process pending events
processed_count = event_bus.process_pending_events(batch_size=100)

# Reset failed events for retry
reset_count = event_bus.reset_failed_events(max_retries=3)
```

### Manual SLA Checks

You can manually trigger SLA checks:

```python
from api.services.sla_scheduler import sla_scheduler

# Check overdue tasks
overdue_count = sla_scheduler.check_overdue_tasks()

# Check no response 48h rule
escalate_count = sla_scheduler.check_no_response_48h()
```

## API Endpoints

### Communication Logging

**POST** `/api/crm/communications/`

Create a communication log entry and emit `CommunicationLogged` event:

```json
{
  "from_user_id": "uuid",
  "to_contact_id": "uuid",
  "to_lead_id": "uuid",
  "communication_type": "email",
  "subject": "Subject",
  "content": "Content",
  "direction": "outbound",
  "status": "sent",
  "template_id": "uuid"
}
```

## Configuration

### Environment Variables

No new environment variables are required. The system uses existing Slack configuration:

- `SLACK_WEBHOOK_URL` - Slack webhook URL
- `SLACK_CHANNEL` - Slack channel for notifications
- `SLACK_ENABLED` - Enable/disable Slack notifications

### Task Columns

The automation rules expect specific task columns:

- **Inbox**: Column named "Inbox" (case-insensitive)
- **Negotiation**: Column named containing "Negotiation" (case-insensitive)

Ensure these columns exist in your task boards before using automation rules.

## Error Handling

- Events that fail to process are marked as `failed` and retried up to 3 times
- Failed events can be reset to `pending` status for retry
- Automation rule failures are logged but don't block event processing
- SLA check failures are logged but don't stop the scheduler

## Monitoring

### Event Outbox Status

Check event processing status:

```sql
SELECT status, COUNT(*) 
FROM event_outbox 
GROUP BY status;
```

### Overdue Tasks

Check overdue tasks:

```sql
SELECT t.*, tt.tag_name
FROM tasks t
LEFT JOIN task_tags tt ON tt.task_id = t.id AND tt.tag_name = 'Overdue'
WHERE t.due_at < NOW() 
  AND t.status != 'Done';
```

## Future Enhancements

1. **Kafka/RabbitMQ Integration**: Replace in-memory event bus with external message queue
2. **More Automation Rules**: Add rules for deal stage changes, lead status changes
3. **Configurable SLA Rules**: Make SLA rules configurable via admin interface
4. **Slack DM Support**: Use Slack API for direct messages instead of webhooks
5. **Event Replay**: Add ability to replay events for debugging/recovery

## Testing

### Test Event Emission

```python
from api.services.event_bus import publish_lead_created
from uuid import uuid4

publish_lead_created(
    lead_id=uuid4(),
    contact_id=uuid4(),
    assigned_to=uuid4(),
    created_by=uuid4()
)
```

### Test Automation Rules

Create a lead and verify the "First contact seller" task is created:

```python
from api.repositories.crm_leads import create_lead
from api.schemas.crm import LeadCreate

lead = create_lead(
    LeadCreate(assigned_to=user_id, ...),
    created_by=user_id
)
# Check that task was created
```

### Test SLA Scheduler

```python
from api.services.sla_scheduler import sla_scheduler

# Check overdue tasks
overdue_count = sla_scheduler.check_overdue_tasks()
print(f"Found {overdue_count} overdue tasks")
```

## Troubleshooting

### Events Not Processing

1. Check `event_outbox` table for pending events
2. Verify background jobs are running (check logs)
3. Check for errors in `error_message` column

### Automation Rules Not Triggering

1. Verify event is being emitted (check `event_outbox` table)
2. Check automation service logs for errors
3. Verify task columns exist (Inbox, Negotiation)
4. Check that lead/deal has `assigned_to` set

### Slack Notifications Not Sending

1. Verify `SLACK_ENABLED=true` and `SLACK_WEBHOOK_URL` is set
2. Check Slack service logs for errors
3. Verify webhook URL is valid

