-- Migration 006: Add contact_id to existing leads table
-- This migration handles the case where an existing leads table doesn't have the contact_id column
-- Run after 004_crm_schema.sql if you have an existing leads table without contact_id
--
-- This migration is idempotent and safe to run multiple times

-- Ensure contact_id column exists if table already existed without it
-- The contacts table must exist before this runs (it's created in 004_crm_schema.sql)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        -- Add contact_id if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'contact_id'
        ) THEN
            ALTER TABLE leads ADD COLUMN contact_id UUID REFERENCES contacts(id);
            RAISE NOTICE 'Added contact_id column to leads table';
        ELSE
            RAISE NOTICE 'contact_id column already exists in leads table';
        END IF;
        
        -- Add listing_id if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'listing_id'
        ) THEN
            ALTER TABLE leads ADD COLUMN listing_id INTEGER REFERENCES listings(id);
            RAISE NOTICE 'Added listing_id column to leads table';
        END IF;
        
        -- Add status_id if it doesn't exist (might be named lead_status_id)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'status_id'
        ) THEN
            -- Check if lead_status_id exists and rename it, otherwise add new
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'leads' AND column_name = 'lead_status_id'
            ) THEN
                ALTER TABLE leads RENAME COLUMN lead_status_id TO status_id;
                RAISE NOTICE 'Renamed lead_status_id to status_id in leads table';
            ELSE
                ALTER TABLE leads ADD COLUMN status_id INTEGER REFERENCES lead_statuses(id);
                RAISE NOTICE 'Added status_id column to leads table';
            END IF;
        END IF;
        
        -- Add source_id if it doesn't exist (might be named lead_source_id)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'leads' AND column_name = 'source_id'
        ) THEN
            -- Check if lead_source_id exists and rename it, otherwise add new
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'leads' AND column_name = 'lead_source_id'
            ) THEN
                ALTER TABLE leads RENAME COLUMN lead_source_id TO source_id;
                RAISE NOTICE 'Renamed lead_source_id to source_id in leads table';
            ELSE
                ALTER TABLE leads ADD COLUMN source_id INTEGER REFERENCES lead_sources(id);
                RAISE NOTICE 'Added source_id column to leads table';
            END IF;
        END IF;
        
        -- Ensure other required columns exist
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS vehicle_interest JSONB;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget_range JSONB;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Add constraint for lead_score if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'leads_lead_score_check'
        ) THEN
            ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_lead_score_check;
            ALTER TABLE leads ADD CONSTRAINT leads_lead_score_check 
                CHECK (lead_score BETWEEN 0 AND 100);
        END IF;
        
        -- Create indexes if they don't exist
        CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON leads(contact_id);
        CREATE INDEX IF NOT EXISTS idx_leads_listing_id ON leads(listing_id);
        CREATE INDEX IF NOT EXISTS idx_leads_status_id ON leads(status_id);
        CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);
        
        RAISE NOTICE 'Migration 006 completed successfully';
    ELSE
        RAISE NOTICE 'leads table does not exist, skipping migration';
    END IF;
END $$;

