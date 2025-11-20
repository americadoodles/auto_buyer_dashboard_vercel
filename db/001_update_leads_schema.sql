-- Migration 006: Update leads table to match new schema
-- This migration updates the existing leads table to match the current schema definition
-- Safe to run multiple times (idempotent)

-- ==============================================
-- STEP 1: Rename columns if they exist with old names
-- ==============================================
DO $$
BEGIN
    -- Rename lead_source_id to source_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_source_id'
    ) THEN
        ALTER TABLE leads RENAME COLUMN lead_source_id TO source_id;
    END IF;
    
    -- Rename lead_status_id to status_id if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_status_id'
    ) THEN
        ALTER TABLE leads RENAME COLUMN lead_status_id TO status_id;
    END IF;
END $$;

-- ==============================================
-- STEP 2: Add missing columns if they don't exist
-- ==============================================
DO $$
BEGIN
    -- Add listing_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'listing_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN listing_id INTEGER REFERENCES listings(id);
    END IF;
    
    -- Add contact_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'contact_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN contact_id UUID REFERENCES contacts(id);
    END IF;
    
    -- Add status_id if missing (after rename check)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'status_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN status_id INTEGER REFERENCES lead_statuses(id);
    END IF;
    
    -- Add source_id if missing (after rename check)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'source_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN source_id INTEGER REFERENCES lead_sources(id);
    END IF;
    
    -- Add assigned_to if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE leads ADD COLUMN assigned_to UUID REFERENCES users(id);
    END IF;
    
    -- Add vehicle_interest if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'vehicle_interest'
    ) THEN
        ALTER TABLE leads ADD COLUMN vehicle_interest JSONB;
    END IF;
    
    -- Add budget_range if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'budget_range'
    ) THEN
        ALTER TABLE leads ADD COLUMN budget_range JSONB;
    END IF;
    
    -- Add notes if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'notes'
    ) THEN
        ALTER TABLE leads ADD COLUMN notes TEXT;
    END IF;
    
    -- Add lead_score if missing (with constraint)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_score'
    ) THEN
        ALTER TABLE leads ADD COLUMN lead_score INTEGER DEFAULT 0;
        -- Add constraint separately
        ALTER TABLE leads ADD CONSTRAINT leads_lead_score_check 
            CHECK (lead_score BETWEEN 0 AND 100);
    END IF;
    
    -- Add qualified_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'qualified_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN qualified_at TIMESTAMPTZ;
    END IF;
    
    -- Add converted_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'converted_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN converted_at TIMESTAMPTZ;
    END IF;
    
    -- Add created_by if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE leads ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
    
    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ==============================================
-- STEP 3: Drop old columns that are no longer needed
-- ==============================================
-- These columns should be in the contacts table instead
ALTER TABLE leads DROP COLUMN IF EXISTS first_name;
ALTER TABLE leads DROP COLUMN IF EXISTS last_name;
ALTER TABLE leads DROP COLUMN IF EXISTS email;
ALTER TABLE leads DROP COLUMN IF EXISTS phone;
ALTER TABLE leads DROP COLUMN IF EXISTS mobile;
ALTER TABLE leads DROP COLUMN IF EXISTS company;
ALTER TABLE leads DROP COLUMN IF EXISTS job_title;
ALTER TABLE leads DROP COLUMN IF EXISTS location;
ALTER TABLE leads DROP COLUMN IF EXISTS is_qualified;

-- ==============================================
-- STEP 4: Ensure constraints are in place
-- ==============================================
-- Add lead_score constraint if column exists but constraint doesn't
DO $$
BEGIN
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

-- ==============================================
-- STEP 5: Create/update indexes
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_id ON leads(status_id);
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Drop old indexes that might reference removed columns
DROP INDEX IF EXISTS idx_leads_email;
DROP INDEX IF EXISTS idx_leads_phone;

-- ==============================================
-- STEP 6: Update or create the lead summary view
-- ==============================================
DROP VIEW IF EXISTS v_lead_summary CASCADE;

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
    l.converted_at,
    l.created_at,
    l.updated_at
FROM leads l
LEFT JOIN lead_statuses ls ON l.status_id = ls.id
LEFT JOIN lead_sources lsrc ON l.source_id = lsrc.id
LEFT JOIN contacts c ON l.contact_id = c.id
LEFT JOIN users u ON l.assigned_to = u.id
LEFT JOIN listings lst ON l.listing_id = lst.id;

-- ==============================================
-- STEP 7: Add comments for documentation
-- ==============================================
COMMENT ON TABLE leads IS 'Leads represent potential customers interested in specific listings, linked to contacts';
COMMENT ON COLUMN leads.listing_id IS 'Reference to the listing the lead is interested in';
COMMENT ON COLUMN leads.contact_id IS 'Reference to the contact information for this lead';
COMMENT ON COLUMN leads.status_id IS 'Current status of the lead (references lead_statuses table)';
COMMENT ON COLUMN leads.source_id IS 'How the lead was generated (references lead_sources table)';
COMMENT ON COLUMN leads.assigned_to IS 'User responsible for following up on this lead';
COMMENT ON COLUMN leads.vehicle_interest IS 'JSONB field storing vehicle preferences and interests';
COMMENT ON COLUMN leads.budget_range IS 'JSONB field storing min/max budget information';
COMMENT ON COLUMN leads.notes IS 'Additional notes about the lead';
COMMENT ON COLUMN leads.lead_score IS 'Score representing the quality/potential of the lead (0-100)';
COMMENT ON COLUMN leads.qualified_at IS 'Timestamp when the lead was qualified';
COMMENT ON COLUMN leads.converted_at IS 'Timestamp when the lead was converted to a customer';
COMMENT ON COLUMN leads.created_by IS 'User who created this lead record';
COMMENT ON COLUMN leads.created_at IS 'Timestamp when the lead record was created';
COMMENT ON COLUMN leads.updated_at IS 'Timestamp when the lead record was last updated';

