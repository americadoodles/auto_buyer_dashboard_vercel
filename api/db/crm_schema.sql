-- Migration 004: CRM Schema
-- Creates comprehensive CRM functionality including leads, contacts, deals, and tasks
-- Run after 003_add_user_activity.sql

-- ==============================================
-- CONTACT MANAGEMENT (must come before leads)
-- ==============================================

-- Contact types (Customer, Prospect, Vendor, Partner)
CREATE TABLE IF NOT EXISTS contact_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    company TEXT,
    job_title TEXT,
    contact_type_id INTEGER REFERENCES contact_types(id),
    assigned_to UUID REFERENCES users(id),
    address JSONB, -- Full address object
    social_profiles JSONB, -- LinkedIn, Facebook, etc.
    preferences JSONB, -- Communication preferences
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact activities
CREATE TABLE IF NOT EXISTS contact_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    subject TEXT,
    description TEXT,
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- LEAD MANAGEMENT
-- ==============================================

-- Lead sources and categories
CREATE TABLE IF NOT EXISTS lead_sources (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead statuses (New, Contacted, Qualified, Converted, Lost)
CREATE TABLE IF NOT EXISTS lead_statuses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color_code TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main leads table
-- Leads represent potential customers interested in specific listings, linked to contacts
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id INTEGER REFERENCES listings(id),
    contact_id UUID REFERENCES contacts(id),
    status_id INTEGER REFERENCES lead_statuses(id),
    source_id INTEGER REFERENCES lead_sources(id),
    assigned_to UUID REFERENCES users(id),
    vehicle_interest JSONB, -- Store vehicle preferences
    budget_range JSONB, -- Min/max budget
    notes TEXT,
    lead_score INTEGER DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
    qualified_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update existing leads table to match new schema
DO $$
BEGIN
    -- Rename old column names if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_source_id'
    ) THEN
        ALTER TABLE leads RENAME COLUMN lead_source_id TO source_id;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_status_id'
    ) THEN
        ALTER TABLE leads RENAME COLUMN lead_status_id TO status_id;
    END IF;
    
    -- Add missing columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'listing_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN listing_id INTEGER REFERENCES listings(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'contact_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN contact_id UUID REFERENCES contacts(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'status_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN status_id INTEGER REFERENCES lead_statuses(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'source_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN source_id INTEGER REFERENCES lead_sources(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE leads ADD COLUMN assigned_to UUID REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'vehicle_interest'
    ) THEN
        ALTER TABLE leads ADD COLUMN vehicle_interest JSONB;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'budget_range'
    ) THEN
        ALTER TABLE leads ADD COLUMN budget_range JSONB;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'notes'
    ) THEN
        ALTER TABLE leads ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_score'
    ) THEN
        ALTER TABLE leads ADD COLUMN lead_score INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'qualified_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN qualified_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'converted_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN converted_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE leads ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Ensure lead_score constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_score'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'leads' AND constraint_name = 'leads_lead_score_check'
    ) THEN
        ALTER TABLE leads ADD CONSTRAINT leads_lead_score_check 
            CHECK (lead_score BETWEEN 0 AND 100);
    END IF;
END $$;

-- Drop old columns that should be in contacts table instead
ALTER TABLE leads DROP COLUMN IF EXISTS first_name;
ALTER TABLE leads DROP COLUMN IF EXISTS second_name;
ALTER TABLE leads DROP COLUMN IF EXISTS last_name;
ALTER TABLE leads DROP COLUMN IF EXISTS email;
ALTER TABLE leads DROP COLUMN IF EXISTS phone;
ALTER TABLE leads DROP COLUMN IF EXISTS mobile;
ALTER TABLE leads DROP COLUMN IF EXISTS company;
ALTER TABLE leads DROP COLUMN IF EXISTS job_title;
ALTER TABLE leads DROP COLUMN IF EXISTS location;
ALTER TABLE leads DROP COLUMN IF EXISTS is_qualified;

-- Lead activities (calls, emails, meetings)
CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'call', 'email', 'meeting', 'note'
    subject TEXT,
    description TEXT,
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- DEAL & OPPORTUNITY MANAGEMENT
-- ==============================================

-- Deal stages (Prospecting, Qualification, Proposal, Negotiation, Closed Won/Lost)
CREATE TABLE IF NOT EXISTS deal_stages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
    color_code TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal categories
CREATE TABLE IF NOT EXISTS deal_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main deals table
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    contact_id UUID REFERENCES contacts(id),
    assigned_to UUID REFERENCES users(id),
    deal_stage_id INTEGER REFERENCES deal_stages(id),
    deal_category_id INTEGER REFERENCES deal_categories(id),
    expected_close_date DATE,
    actual_close_date DATE,
    deal_value DECIMAL(15,2),
    probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
    vehicle_requirements JSONB, -- Specific vehicle needs
    financing_requirements JSONB, -- Financing details
    trade_in_info JSONB, -- Trade-in vehicle details
    notes TEXT,
    is_won BOOLEAN DEFAULT false,
    is_lost BOOLEAN DEFAULT false,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    lost_reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add lead_id column to deals table if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deals' AND column_name = 'lead_id'
    ) THEN
        ALTER TABLE deals ADD COLUMN lead_id UUID REFERENCES leads(id);
    END IF;
END $$;

-- Deal activities
CREATE TABLE IF NOT EXISTS deal_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    subject TEXT,
    description TEXT,
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- VEHICLE INTEGRATION
-- ==============================================

-- Link leads/contacts to specific vehicles
CREATE TABLE IF NOT EXISTS lead_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    vehicle_key TEXT REFERENCES vehicles(vehicle_key),
    interest_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link deals to specific vehicles
CREATE TABLE IF NOT EXISTS deal_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    vehicle_key TEXT REFERENCES vehicles(vehicle_key),
    is_primary BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- TASK & ACTIVITY MANAGEMENT (Kanban Structure)
-- ==============================================

-- Task priorities
CREATE TABLE IF NOT EXISTS task_priorities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color_code TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task statuses
CREATE TABLE IF NOT EXISTS task_statuses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color_code TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task boards (global, team, or my scope)
CREATE TABLE IF NOT EXISTS task_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('global', 'team', 'my')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task columns (Kanban columns within boards)
CREATE TABLE IF NOT EXISTS task_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES task_boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    wip_limit INTEGER, -- Work In Progress limit (NULL = unlimited)
    position INTEGER NOT NULL DEFAULT 0, -- Order within board
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main tasks table (Kanban structure)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    related_type TEXT, -- 'lead', 'contact', 'deal', etc.
    related_id UUID, -- Generic related entity ID
    title TEXT NOT NULL,
    description TEXT,
    priority_id INTEGER REFERENCES task_priorities(id),
    status_id INTEGER REFERENCES task_statuses(id),
    column_id UUID REFERENCES task_columns(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id),
    due_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    related_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'related_type') THEN
        ALTER TABLE tasks ADD COLUMN related_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'related_id') THEN
        ALTER TABLE tasks ADD COLUMN related_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'owner_user_id') THEN
        ALTER TABLE tasks ADD COLUMN owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'column_id') THEN
        ALTER TABLE tasks ADD COLUMN column_id UUID REFERENCES task_columns(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_at') THEN
        ALTER TABLE tasks ADD COLUMN due_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_date') THEN
        ALTER TABLE tasks ADD COLUMN due_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'priority_id') THEN
        ALTER TABLE tasks ADD COLUMN priority_id INTEGER REFERENCES task_priorities(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status_id') THEN
        ALTER TABLE tasks ADD COLUMN status_id INTEGER REFERENCES task_statuses(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'assigned_to') THEN
        ALTER TABLE tasks ADD COLUMN assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'created_by') THEN
        ALTER TABLE tasks ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed_at') THEN
        ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'related_lead_id') THEN
        ALTER TABLE tasks ADD COLUMN related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'related_contact_id') THEN
        ALTER TABLE tasks ADD COLUMN related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'related_deal_id') THEN
        ALTER TABLE tasks ADD COLUMN related_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'is_recurring') THEN
        ALTER TABLE tasks ADD COLUMN is_recurring BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'recurrence_pattern') THEN
        ALTER TABLE tasks ADD COLUMN recurrence_pattern TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'title') THEN
        ALTER TABLE tasks ADD COLUMN title TEXT NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'description') THEN
        ALTER TABLE tasks ADD COLUMN description TEXT;
    END IF;
END $$;

-- Drop existing views if they exist (must be done before dropping columns they depend on)
DROP VIEW IF EXISTS v_lead_summary CASCADE;
DROP VIEW IF EXISTS v_deal_pipeline CASCADE;
DROP VIEW IF EXISTS v_task_dashboard CASCADE;

-- Remove old priority and status TEXT columns if they exist
DO $$
BEGIN
    -- Drop priority TEXT column and its constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'priority'
    ) THEN
        -- Drop the check constraint first if it exists
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
        -- Drop the column (CASCADE will drop dependent views if any remain)
        ALTER TABLE tasks DROP COLUMN priority CASCADE;
    END IF;
    
    -- Drop status TEXT column and its constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'status'
    ) THEN
        -- Drop the check constraint first if it exists
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
        -- Drop the column (CASCADE will drop dependent views if any remain)
        ALTER TABLE tasks DROP COLUMN status CASCADE;
    END IF;
END $$;

-- Task activity log
CREATE TABLE IF NOT EXISTS task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'created', 'updated', 'moved', 'assigned', 'commented', etc.
    payload_json JSONB, -- Flexible JSON payload for activity details
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- COMMUNICATION & NOTIFICATIONS
-- ==============================================

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    template_type TEXT NOT NULL, -- 'lead_followup', 'deal_reminder', 'welcome'
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication log
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES users(id),
    to_contact_id UUID REFERENCES contacts(id),
    to_lead_id UUID REFERENCES leads(id),
    communication_type TEXT NOT NULL, -- 'email', 'call', 'sms', 'meeting'
    subject TEXT,
    content TEXT,
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
    template_id UUID REFERENCES email_templates(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- ANALYTICS & REPORTING
-- ==============================================

-- KPI definitions
CREATE TABLE IF NOT EXISTS kpi_definitions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    calculation_method TEXT NOT NULL,
    target_value DECIMAL(15,2),
    unit TEXT, -- 'count', 'percentage', 'currency'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPI measurements
CREATE TABLE IF NOT EXISTS kpi_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id INTEGER REFERENCES kpi_definitions(id),
    user_id UUID REFERENCES users(id),
    measurement_date DATE,
    value DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Lead indexes
CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status_id ON leads(status_id);
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);

-- Contact indexes
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type_id);

-- Deal indexes
CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
-- Only create lead_id index if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deals' AND column_name = 'lead_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_deals_lead_id ON deals(lead_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(deal_stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close_date);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_related ON tasks(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_due ON tasks(owner_user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_id ON tasks(priority_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_related_lead_id ON tasks(related_lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related_contact_id ON tasks(related_contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related_deal_id ON tasks(related_deal_id);
CREATE INDEX IF NOT EXISTS idx_task_priorities_name ON task_priorities(name);
CREATE INDEX IF NOT EXISTS idx_task_statuses_name ON task_statuses(name);
CREATE INDEX IF NOT EXISTS idx_task_columns_board_id ON task_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_user_id ON task_activity(user_id);

-- Activity indexes
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_contact_activities_contact ON contact_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON deal_activities(deal_id);

-- ==============================================
-- VIEWS FOR COMMON QUERIES
-- ==============================================

-- Note: Views were dropped earlier before dropping columns
-- Recreate them here with the updated schema

-- Lead summary view
CREATE VIEW v_lead_summary AS
SELECT 
    l.id,
    l.listing_id,
    l.contact_id,
    c.first_name || ' ' || c.last_name as contact_name,
    c.email as contact_email,
    c.phone as contact_phone,
    ls.name as status_name,
    ls.color_code as status_color,
    lsrc.name as source_name,
    u.username as assigned_to_name,
    l.vehicle_interest,
    l.budget_range,
    l.notes,
    l.lead_score,
    l.qualified_at,
    l.converted_at
FROM leads l
LEFT JOIN lead_statuses ls ON l.status_id = ls.id
LEFT JOIN lead_sources lsrc ON l.source_id = lsrc.id
LEFT JOIN contacts c ON l.contact_id = c.id
LEFT JOIN users u ON l.assigned_to = u.id
LEFT JOIN listings lst ON l.listing_id = lst.id;

-- Deal pipeline view
CREATE VIEW v_deal_pipeline AS
SELECT 
    d.id,
    d.name,
    d.deal_value,
    d.probability,
    d.expected_close_date,
    ds.name as stage_name,
    ds.color_code as stage_color,
    c.first_name || ' ' || c.last_name as contact_name,
    u.username as assigned_to_name,
    d.created_at,
    d.updated_at
FROM deals d
LEFT JOIN deal_stages ds ON d.deal_stage_id = ds.id
LEFT JOIN contacts c ON d.contact_id = c.id
LEFT JOIN users u ON d.assigned_to = u.id;

-- Task dashboard view (updated for Kanban structure)
CREATE VIEW v_task_dashboard AS
SELECT 
    t.id,
    t.title,
    COALESCE(t.due_date, t.due_at) as due_date,
    tp.name as priority_name,
    tp.color_code as priority_color,
    ts.name as status_name,
    ts.color_code as status_color,
    u.username as owner_user_name,
    u_assigned.username as assigned_to_name,
    tc.name as column_name,
    tb.name as board_name,
    t.created_at
FROM tasks t
LEFT JOIN task_priorities tp ON t.priority_id = tp.id
LEFT JOIN task_statuses ts ON t.status_id = ts.id
LEFT JOIN users u ON t.owner_user_id = u.id
LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
LEFT JOIN task_columns tc ON t.column_id = tc.id
LEFT JOIN task_boards tb ON tc.board_id = tb.id;

-- ==============================================
-- CLEANUP DUPLICATES BEFORE SEEDING
-- ==============================================
-- Remove duplicates from task_priorities (keep lowest ID)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_priorities') THEN
        DELETE FROM task_priorities
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
                FROM task_priorities
            ) t
            WHERE rn > 1
        );
    END IF;
END $$;

-- Remove duplicates from task_statuses (keep lowest ID)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_statuses') THEN
        DELETE FROM task_statuses
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
                FROM task_statuses
            ) t
            WHERE rn > 1
        );
    END IF;
END $$;

-- ==============================================
-- CREATE CASE-INSENSITIVE UNIQUE INDEXES
-- ==============================================
-- Drop existing indexes if they exist
DROP INDEX IF EXISTS ux_task_priorities_name_ci;
DROP INDEX IF EXISTS ux_task_statuses_name_ci;

-- Create unique case-insensitive indexes (allows safe idempotent inserts)
CREATE UNIQUE INDEX IF NOT EXISTS ux_task_priorities_name_ci ON task_priorities (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS ux_task_statuses_name_ci ON task_statuses (LOWER(name));

-- ==============================================
-- SEED DEFAULT TASK PRIORITIES AND STATUSES
-- ==============================================

-- Insert default task priorities (idempotent)
INSERT INTO task_priorities (name, description, color_code, sort_order)
SELECT * FROM (VALUES
    ('Low', 'Low priority task', '#6B7280', 1),
    ('Medium', 'Medium priority task', '#F59E0B', 2),
    ('High', 'High priority task', '#EF4444', 3),
    ('Urgent', 'Urgent task', '#DC2626', 4)
) AS v(name, description, color_code, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM task_priorities WHERE LOWER(task_priorities.name) = LOWER(v.name)
);

-- Insert default task statuses (idempotent)
INSERT INTO task_statuses (name, description, color_code, sort_order, is_active)
SELECT * FROM (VALUES
    ('Not Started', 'Task not started', '#6B7280', 1, true),
    ('In Progress', 'Task in progress', '#3B82F6', 2, true),
    ('Completed', 'Task completed', '#059669', 3, true),
    ('Cancelled', 'Task cancelled', '#EF4444', 4, true)
) AS v(name, description, color_code, sort_order, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM task_statuses WHERE LOWER(task_statuses.name) = LOWER(v.name)
);
