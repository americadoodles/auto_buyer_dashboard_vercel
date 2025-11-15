-- CRM Database Schema for Auto-Buyer Platform
-- Extends existing vehicle scoring system with comprehensive CRM functionality

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
-- CONTACT MANAGEMENT
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
    lost_reason TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'InProgress', 'Done', 'Snoozed')),
    column_id UUID REFERENCES task_columns(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task activity log
CREATE TABLE IF NOT EXISTS task_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'created', 'updated', 'moved', 'assigned', 'commented', etc.
    payload_json JSONB, -- Flexible JSON payload for activity details
    at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL
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
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(deal_stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close_date);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_related ON tasks(related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_due ON tasks(owner_user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
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

-- Lead summary view
CREATE OR REPLACE VIEW v_lead_summary AS
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
CREATE OR REPLACE VIEW v_deal_pipeline AS
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
CREATE OR REPLACE VIEW v_task_dashboard AS
SELECT 
    t.id,
    t.title,
    t.due_at as due_date,
    t.priority as priority_name,
    t.status as status_name,
    u.username as owner_user_name,
    tc.name as column_name,
    tb.name as board_name,
    t.created_at
FROM tasks t
LEFT JOIN users u ON t.owner_user_id = u.id
LEFT JOIN task_columns tc ON t.column_id = tc.id
LEFT JOIN task_boards tb ON tc.board_id = tb.id;

-- ==============================================
-- INITIAL DATA SEEDING
-- ==============================================

-- Clean up any existing duplicates before creating unique indexes
-- This handles cases where data was inserted before unique constraints existed
DO $$
BEGIN
    -- Remove duplicate lead_sources (keep lowest ID)
    DELETE FROM lead_sources
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
            FROM lead_sources
        ) t WHERE rn > 1
    );
    
    -- Remove duplicate lead_statuses
    DELETE FROM lead_statuses
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
            FROM lead_statuses
        ) t WHERE rn > 1
    );
    
    -- Remove duplicate contact_types
    DELETE FROM contact_types
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
            FROM contact_types
        ) t WHERE rn > 1
    );
    
    -- Remove duplicate deal_stages
    DELETE FROM deal_stages
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
            FROM deal_stages
        ) t WHERE rn > 1
    );
    
    -- Remove duplicate deal_categories
    DELETE FROM deal_categories
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
            FROM deal_categories
        ) t WHERE rn > 1
    );
    
    -- Remove duplicate task_boards (if any)
    DELETE FROM task_boards
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(name), scope ORDER BY id) as rn
            FROM task_boards
        ) t WHERE rn > 1
    );
    
    -- Remove duplicate kpi_definitions
    DELETE FROM kpi_definitions
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
            FROM kpi_definitions
        ) t WHERE rn > 1
    );
END $$;

-- Drop existing indexes if they exist (in case of partial/failed creation)
DROP INDEX IF EXISTS ux_lead_sources_name_ci;
DROP INDEX IF EXISTS ux_lead_statuses_name_ci;
DROP INDEX IF EXISTS ux_contact_types_name_ci;
DROP INDEX IF EXISTS ux_deal_stages_name_ci;
DROP INDEX IF EXISTS ux_deal_categories_name_ci;
DROP INDEX IF EXISTS ux_kpi_definitions_name_ci;

-- Ensure unique names for lookup tables (case-insensitive)
-- These indexes make seed inserts idempotent and prevent duplicate options
CREATE UNIQUE INDEX ux_lead_sources_name_ci ON lead_sources (LOWER(name));
CREATE UNIQUE INDEX ux_lead_statuses_name_ci ON lead_statuses (LOWER(name));
CREATE UNIQUE INDEX ux_contact_types_name_ci ON contact_types (LOWER(name));
CREATE UNIQUE INDEX ux_deal_stages_name_ci ON deal_stages (LOWER(name));
CREATE UNIQUE INDEX ux_deal_categories_name_ci ON deal_categories (LOWER(name));
CREATE UNIQUE INDEX ux_kpi_definitions_name_ci ON kpi_definitions (LOWER(name));

-- Insert default lead sources (using WHERE NOT EXISTS to handle unique index)
INSERT INTO lead_sources (name, description)
SELECT * FROM (VALUES
    ('Website', 'Lead generated from website'),
    ('Referral', 'Lead from customer referral'),
    ('Cold Call', 'Lead from cold calling'),
    ('Email Campaign', 'Lead from email marketing'),
    ('Social Media', 'Lead from social media'),
    ('Trade Show', 'Lead from trade show/event'),
    ('Vehicle Listing', 'Lead from vehicle listing interest')
) AS v(name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM lead_sources WHERE LOWER(lead_sources.name) = LOWER(v.name)
);

-- Insert default lead statuses
INSERT INTO lead_statuses (name, description, color_code, sort_order)
SELECT * FROM (VALUES
    ('New', 'Newly created lead', '#3B82F6', 1),
    ('Contacted', 'Initial contact made', '#10B981', 2),
    ('Qualified', 'Lead qualified for sales', '#F59E0B', 3),
    ('Converted', 'Lead converted to customer', '#059669', 4),
    ('Lost', 'Lead lost or disqualified', '#EF4444', 5)
) AS v(name, description, color_code, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM lead_statuses WHERE LOWER(lead_statuses.name) = LOWER(v.name)
);

-- Insert default contact types
INSERT INTO contact_types (name, description)
SELECT * FROM (VALUES
    ('Customer', 'Existing customer'),
    ('Prospect', 'Potential customer'),
    ('Vendor', 'Vendor or supplier'),
    ('Partner', 'Business partner')
) AS v(name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM contact_types WHERE LOWER(contact_types.name) = LOWER(v.name)
);

-- Insert default deal stages
INSERT INTO deal_stages (name, description, probability, color_code, sort_order)
SELECT * FROM (VALUES
    ('Prospecting', 'Initial prospecting phase', 10, '#3B82F6', 1),
    ('Qualification', 'Qualifying the opportunity', 25, '#10B981', 2),
    ('Proposal', 'Proposal sent to customer', 50, '#F59E0B', 3),
    ('Negotiation', 'Negotiating terms', 75, '#8B5CF6', 4),
    ('Closed Won', 'Deal successfully closed', 100, '#059669', 5),
    ('Closed Lost', 'Deal lost', 0, '#EF4444', 6)
) AS v(name, description, probability, color_code, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM deal_stages WHERE LOWER(deal_stages.name) = LOWER(v.name)
);

-- Insert default deal categories
INSERT INTO deal_categories (name, description)
SELECT * FROM (VALUES
    ('New Vehicle Sale', 'Sale of new vehicle'),
    ('Used Vehicle Sale', 'Sale of used vehicle'),
    ('Trade-In', 'Vehicle trade-in transaction'),
    ('Financing', 'Vehicle financing deal'),
    ('Service', 'Vehicle service agreement')
) AS v(name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM deal_categories WHERE LOWER(deal_categories.name) = LOWER(v.name)
);

-- Insert default task boards
INSERT INTO task_boards (id, name, scope)
SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000001'::UUID, 'My Tasks', 'my'),
    ('00000000-0000-0000-0000-000000000002'::UUID, 'Team Board', 'team'),
    ('00000000-0000-0000-0000-000000000003'::UUID, 'Global Board', 'global')
) AS v(id, name, scope)
ON CONFLICT (id) DO NOTHING;

-- Insert default task columns for My Tasks board
INSERT INTO task_columns (id, board_id, name, wip_limit, position)
SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000011'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'To Do', NULL, 0),
    ('00000000-0000-0000-0000-000000000012'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'In Progress', 5, 1),
    ('00000000-0000-0000-0000-000000000013'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'Done', NULL, 2)
) AS v(id, board_id, name, wip_limit, position)
ON CONFLICT (id) DO NOTHING;

-- Insert default task columns for Team Board
INSERT INTO task_columns (id, board_id, name, wip_limit, position)
SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000021'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'Backlog', NULL, 0),
    ('00000000-0000-0000-0000-000000000022'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'To Do', NULL, 1),
    ('00000000-0000-0000-0000-000000000023'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'In Progress', 10, 2),
    ('00000000-0000-0000-0000-000000000024'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'Review', NULL, 3),
    ('00000000-0000-0000-0000-000000000025'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 'Done', NULL, 4)
) AS v(id, board_id, name, wip_limit, position)
ON CONFLICT (id) DO NOTHING;

-- Insert default task columns for Global Board
INSERT INTO task_columns (id, board_id, name, wip_limit, position)
SELECT * FROM (VALUES
    ('00000000-0000-0000-0000-000000000031'::UUID, '00000000-0000-0000-0000-000000000003'::UUID, 'Backlog', NULL, 0),
    ('00000000-0000-0000-0000-000000000032'::UUID, '00000000-0000-0000-0000-000000000003'::UUID, 'To Do', NULL, 1),
    ('00000000-0000-0000-0000-000000000033'::UUID, '00000000-0000-0000-0000-000000000003'::UUID, 'In Progress', 20, 2),
    ('00000000-0000-0000-0000-000000000034'::UUID, '00000000-0000-0000-0000-000000000003'::UUID, 'Done', NULL, 3)
) AS v(id, board_id, name, wip_limit, position)
ON CONFLICT (id) DO NOTHING;

-- Insert default KPI definitions
INSERT INTO kpi_definitions (name, description, calculation_method, target_value, unit)
SELECT * FROM (VALUES
    ('Leads Generated', 'Number of new leads created', 'COUNT', 50, 'count'),
    ('Lead Conversion Rate', 'Percentage of leads converted to customers', 'PERCENTAGE', 15, 'percentage'),
    ('Deals Closed', 'Number of deals closed', 'COUNT', 20, 'count'),
    ('Revenue Generated', 'Total revenue from closed deals', 'SUM', 500000, 'currency'),
    ('Average Deal Size', 'Average value of closed deals', 'AVERAGE', 25000, 'currency')
) AS v(name, description, calculation_method, target_value, unit)
WHERE NOT EXISTS (
    SELECT 1 FROM kpi_definitions WHERE LOWER(kpi_definitions.name) = LOWER(v.name)
);
