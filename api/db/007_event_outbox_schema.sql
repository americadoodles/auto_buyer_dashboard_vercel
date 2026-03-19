-- Event Outbox Pattern Schema
-- This implements the transactional outbox pattern for reliable event publishing

-- Outbox table for events
CREATE TABLE IF NOT EXISTS event_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    -- Indexes for efficient querying
    CONSTRAINT event_outbox_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for event outbox
CREATE INDEX IF NOT EXISTS idx_event_outbox_status ON event_outbox(status, created_at);
CREATE INDEX IF NOT EXISTS idx_event_outbox_event_type ON event_outbox(event_type);
CREATE INDEX IF NOT EXISTS idx_event_outbox_retry_count ON event_outbox(retry_count) WHERE status = 'failed';

-- Task tags table (for tagging tasks like "Overdue")
CREATE TABLE IF NOT EXISTS task_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_name ON task_tags(tag_name);

