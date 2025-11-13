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
    qualified_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id)
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
-- TASK & ACTIVITY MANAGEMENT
-- ==============================================

-- Task priorities
CREATE TABLE IF NOT EXISTS task_priorities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color_code TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task statuses
CREATE TABLE IF NOT EXISTS task_statuses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color_code TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    priority_id INTEGER REFERENCES task_priorities(id),
    status_id INTEGER REFERENCES task_statuses(id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    related_lead_id UUID REFERENCES leads(id),
    related_contact_id UUID REFERENCES contacts(id),
    related_deal_id UUID REFERENCES deals(id),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority_id);

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

-- Task dashboard view
CREATE OR REPLACE VIEW v_task_dashboard AS
SELECT 
    t.id,
    t.title,
    t.due_date,
    tp.name as priority_name,
    tp.color_code as priority_color,
    ts.name as status_name,
    ts.color_code as status_color,
    u.username as assigned_to_name,
    t.created_at
FROM tasks t
LEFT JOIN task_priorities tp ON t.priority_id = tp.id
LEFT JOIN task_statuses ts ON t.status_id = ts.id
LEFT JOIN users u ON t.assigned_to = u.id;

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
    
    -- Remove duplicate task_priorities
    DELETE FROM task_priorities
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
            FROM task_priorities
        ) t WHERE rn > 1
    );
    
    -- Remove duplicate task_statuses
    DELETE FROM task_statuses
    WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
            FROM task_statuses
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
DROP INDEX IF EXISTS ux_task_priorities_name_ci;
DROP INDEX IF EXISTS ux_task_statuses_name_ci;
DROP INDEX IF EXISTS ux_kpi_definitions_name_ci;

-- Ensure unique names for lookup tables (case-insensitive)
-- These indexes make seed inserts idempotent and prevent duplicate options
CREATE UNIQUE INDEX ux_lead_sources_name_ci ON lead_sources (LOWER(name));
CREATE UNIQUE INDEX ux_lead_statuses_name_ci ON lead_statuses (LOWER(name));
CREATE UNIQUE INDEX ux_contact_types_name_ci ON contact_types (LOWER(name));
CREATE UNIQUE INDEX ux_deal_stages_name_ci ON deal_stages (LOWER(name));
CREATE UNIQUE INDEX ux_deal_categories_name_ci ON deal_categories (LOWER(name));
CREATE UNIQUE INDEX ux_task_priorities_name_ci ON task_priorities (LOWER(name));
CREATE UNIQUE INDEX ux_task_statuses_name_ci ON task_statuses (LOWER(name));
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

-- Insert default task priorities
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

-- Insert default task statuses
INSERT INTO task_statuses (name, description, color_code, sort_order)
SELECT * FROM (VALUES
    ('Not Started', 'Task not started', '#6B7280', 1),
    ('In Progress', 'Task in progress', '#3B82F6', 2),
    ('Completed', 'Task completed', '#059669', 3),
    ('Cancelled', 'Task cancelled', '#EF4444', 4)
) AS v(name, description, color_code, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM task_statuses WHERE LOWER(task_statuses.name) = LOWER(v.name)
);

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
