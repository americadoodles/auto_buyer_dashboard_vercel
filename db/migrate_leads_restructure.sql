-- Migration: Restructure leads table
-- This migration modifies the leads table to focus on listing/contact references
-- rather than storing contact information directly in leads

-- Step 1: Drop dependent views that reference leads table
DROP VIEW IF EXISTS v_lead_summary CASCADE;

-- Step 2: Drop indexes on columns we'll be removing
DROP INDEX IF EXISTS idx_leads_email;
DROP INDEX IF EXISTS idx_leads_phone;

-- Step 3: Create a backup of existing leads data (optional but recommended)
-- Uncomment if you want to preserve old data
-- CREATE TABLE IF NOT EXISTS leads_backup AS SELECT * FROM leads;

-- Step 4: Add new columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS listing_id INTEGER REFERENCES listings(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Step 5: Rename columns
-- PostgreSQL doesn't support IF EXISTS for ALTER COLUMN, so we'll handle errors gracefully
DO $$
BEGIN
    -- Rename lead_source_id to source_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_source_id'
    ) THEN
        ALTER TABLE leads RENAME COLUMN lead_source_id TO source_id;
    END IF;
    
    -- Rename lead_status_id to status_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'lead_status_id'
    ) THEN
        ALTER TABLE leads RENAME COLUMN lead_status_id TO status_id;
    END IF;
END $$;

-- Step 6: Drop columns we no longer need
ALTER TABLE leads DROP COLUMN IF EXISTS first_name;
ALTER TABLE leads DROP COLUMN IF EXISTS last_name;
ALTER TABLE leads DROP COLUMN IF EXISTS email;
ALTER TABLE leads DROP COLUMN IF EXISTS phone;
ALTER TABLE leads DROP COLUMN IF EXISTS company;
ALTER TABLE leads DROP COLUMN IF EXISTS job_title;
ALTER TABLE leads DROP COLUMN IF EXISTS location;
ALTER TABLE leads DROP COLUMN IF EXISTS is_qualified;

-- Step 6b: Add/ensure lead_score column exists with proper constraints
-- Drop it first to ensure clean state, then add it back
ALTER TABLE leads DROP COLUMN IF EXISTS lead_score;
ALTER TABLE leads ADD COLUMN lead_score INTEGER DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100);

-- Step 6c: Ensure timestamp columns exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 7: Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);
CREATE INDEX IF NOT EXISTS idx_leads_status_id ON leads(status_id);

-- Step 8: Recreate the lead summary view with new structure
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

-- Step 9: Add comments for documentation
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

