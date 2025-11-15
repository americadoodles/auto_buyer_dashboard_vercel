-- Migration: CRM-TSK-001 - DB migrations for Tasks & Boards (Kanban structure)
-- This migration creates the Kanban-like task management foundation

-- ==============================================
-- TASK BOARDS
-- ==============================================
CREATE TABLE IF NOT EXISTS task_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('global', 'team', 'my')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- TASK COLUMNS
-- ==============================================
CREATE TABLE IF NOT EXISTS task_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES task_boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    wip_limit INTEGER, -- Work In Progress limit (NULL = unlimited)
    position INTEGER NOT NULL DEFAULT 0, -- Order within board
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- TASKS (Refactored for Kanban)
-- ==============================================
-- Drop old tasks table if it exists (after backing up data if needed)
-- Note: In production, you'd want to migrate existing data first
DO $$
BEGIN
    -- Check if old tasks table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        -- Create backup table if it doesn't exist
        CREATE TABLE IF NOT EXISTS tasks_backup AS SELECT * FROM tasks;
        
        -- Drop old foreign key constraints that reference tasks
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_id_fkey;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_id_fkey;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_related_lead_id_fkey;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_related_contact_id_fkey;
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_related_deal_id_fkey;
    END IF;
END $$;

-- Drop old tasks table
DROP TABLE IF EXISTS tasks CASCADE;

-- Create new tasks table with Kanban structure
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    related_type TEXT, -- 'lead', 'contact', 'deal', etc.
    related_id UUID, -- Generic related entity ID
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'InProgress', 'Done', 'Snoozed')),
    column_id UUID REFERENCES task_columns(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- TASK ACTIVITY
-- ==============================================
CREATE TABLE IF NOT EXISTS task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'created', 'updated', 'moved', 'assigned', 'commented', etc.
    payload_json JSONB, -- Flexible JSON payload for activity details
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ==============================================
-- INDEXES
-- ==============================================
-- Index for related entity lookups
CREATE INDEX IF NOT EXISTS idx_tasks_related ON tasks(related_type, related_id);

-- Index for owner and due date queries
CREATE INDEX IF NOT EXISTS idx_tasks_owner_due ON tasks(owner_user_id, due_at);

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_columns_board_id ON task_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_user_id ON task_activity(user_id);

-- ==============================================
-- DEFAULT DATA SEEDING
-- ==============================================

-- Create default boards
INSERT INTO task_boards (id, name, scope)
SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000001'::UUID, 'My Tasks', 'my'),
    ('00000000-0000-0000-0000-000000000002'::UUID, 'Team Board', 'team'),
    ('00000000-0000-0000-0000-000000000003'::UUID, 'Global Board', 'global')
) AS v(id, name, scope)
ON CONFLICT (id) DO NOTHING;

-- Create default columns for each board
-- My Tasks board
INSERT INTO task_columns (id, board_id, name, wip_limit, position)
SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000011'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'To Do', NULL, 0),
    ('00000000-0000-0000-0000-000000000012'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'In Progress', 5, 1),
    ('00000000-0000-0000-0000-000000000013'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'Done', NULL, 2)
) AS v(id, board_id, name, wip_limit, position)
ON CONFLICT (id) DO NOTHING;

-- Team Board
INSERT INTO task_columns (id, board_id, name, wip_limit, position)
SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000021'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'Backlog', NULL, 0),
    ('00000000-0000-0000-0000-000000000022'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'To Do', NULL, 1),
    ('00000000-0000-0000-0000-000000000023'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'In Progress', 10, 2),
    ('00000000-0000-0000-0000-000000000024'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'Review', NULL, 3),
    ('00000000-0000-0000-0000-000000000025'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'Done', NULL, 4)
) AS v(id, board_id, name, wip_limit, position)
ON CONFLICT (id) DO NOTHING;

-- Global Board
INSERT INTO task_columns (id, board_id, name, wip_limit, position)
SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000031'::UUID, '00000000-0000-0000-0000-000000000003'::UUID, 'Backlog', NULL, 0),
    ('00000000-0000-0000-0000-000000000032'::UUID, '00000000-0000-0000-0000-000000000003'::UUID, 'To Do', NULL, 1),
    ('00000000-0000-0000-0000-000000000033'::UUID, '00000000-0000-0000-0000-000000000003'::UUID, 'In Progress', 20, 2),
    ('00000000-0000-0000-0000-000000000034'::UUID, '00000000-0000-0000-0000-000000000003'::UUID, 'Done', NULL, 3)
) AS v(id, board_id, name, wip_limit, position)
ON CONFLICT (id) DO NOTHING;

