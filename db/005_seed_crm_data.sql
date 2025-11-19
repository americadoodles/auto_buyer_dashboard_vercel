-- Migration 005: Seed CRM Default Data
-- Seeds default data for CRM lookup tables and initial boards
-- Run after 004_crm_schema.sql

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

