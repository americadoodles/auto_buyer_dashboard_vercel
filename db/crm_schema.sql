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
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    lead_source_id INTEGER REFERENCES lead_sources(id),
    lead_status_id INTEGER REFERENCES lead_statuses(id),
    assigned_to UUID REFERENCES users(id),
    vehicle_interest JSONB, -- Store vehicle preferences
    budget_range JSONB, -- Min/max budget
    location TEXT,
    notes TEXT,
    lead_score INTEGER DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
    is_qualified BOOLEAN DEFAULT false,
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
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

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
    l.first_name,
    l.last_name,
    l.email,
    l.phone,
    l.lead_score,
    ls.name as status_name,
    ls.color_code as status_color,
    u.username as assigned_to_name,
    l.created_at,
    l.updated_at
FROM leads l
LEFT JOIN lead_statuses ls ON l.lead_status_id = ls.id
LEFT JOIN users u ON l.assigned_to = u.id;

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

-- Insert default lead sources
INSERT INTO lead_sources (name, description) VALUES
('Website', 'Lead generated from website'),
('Referral', 'Lead from customer referral'),
('Cold Call', 'Lead from cold calling'),
('Email Campaign', 'Lead from email marketing'),
('Social Media', 'Lead from social media'),
('Trade Show', 'Lead from trade show/event'),
('Vehicle Listing', 'Lead from vehicle listing interest')
ON CONFLICT DO NOTHING;

-- Insert default lead statuses
INSERT INTO lead_statuses (name, description, color_code, sort_order) VALUES
('New', 'Newly created lead', '#3B82F6', 1),
('Contacted', 'Initial contact made', '#10B981', 2),
('Qualified', 'Lead qualified for sales', '#F59E0B', 3),
('Converted', 'Lead converted to customer', '#059669', 4),
('Lost', 'Lead lost or disqualified', '#EF4444', 5)
ON CONFLICT DO NOTHING;

-- Insert default contact types
INSERT INTO contact_types (name, description) VALUES
('Customer', 'Existing customer'),
('Prospect', 'Potential customer'),
('Vendor', 'Vendor or supplier'),
('Partner', 'Business partner')
ON CONFLICT DO NOTHING;

-- Insert default deal stages
INSERT INTO deal_stages (name, description, probability, color_code, sort_order) VALUES
('Prospecting', 'Initial prospecting phase', 10, '#3B82F6', 1),
('Qualification', 'Qualifying the opportunity', 25, '#10B981', 2),
('Proposal', 'Proposal sent to customer', 50, '#F59E0B', 3),
('Negotiation', 'Negotiating terms', 75, '#8B5CF6', 4),
('Closed Won', 'Deal successfully closed', 100, '#059669', 5),
('Closed Lost', 'Deal lost', 0, '#EF4444', 6)
ON CONFLICT DO NOTHING;

-- Insert default deal categories
INSERT INTO deal_categories (name, description) VALUES
('New Vehicle Sale', 'Sale of new vehicle'),
('Used Vehicle Sale', 'Sale of used vehicle'),
('Trade-In', 'Vehicle trade-in transaction'),
('Financing', 'Vehicle financing deal'),
('Service', 'Vehicle service agreement')
ON CONFLICT DO NOTHING;

-- Insert default task priorities
INSERT INTO task_priorities (name, description, color_code, sort_order) VALUES
('Low', 'Low priority task', '#6B7280', 1),
('Medium', 'Medium priority task', '#F59E0B', 2),
('High', 'High priority task', '#EF4444', 3),
('Urgent', 'Urgent task', '#DC2626', 4)
ON CONFLICT DO NOTHING;

-- Insert default task statuses
INSERT INTO task_statuses (name, description, color_code, sort_order) VALUES
('Not Started', 'Task not started', '#6B7280', 1),
('In Progress', 'Task in progress', '#3B82F6', 2),
('Completed', 'Task completed', '#059669', 3),
('Cancelled', 'Task cancelled', '#EF4444', 4)
ON CONFLICT DO NOTHING;

-- Insert default KPI definitions
INSERT INTO kpi_definitions (name, description, calculation_method, target_value, unit) VALUES
('Leads Generated', 'Number of new leads created', 'COUNT', 50, 'count'),
('Lead Conversion Rate', 'Percentage of leads converted to customers', 'PERCENTAGE', 15, 'percentage'),
('Deals Closed', 'Number of deals closed', 'COUNT', 20, 'count'),
('Revenue Generated', 'Total revenue from closed deals', 'SUM', 500000, 'currency'),
('Average Deal Size', 'Average value of closed deals', 'AVERAGE', 25000, 'currency')
ON CONFLICT DO NOTHING;
