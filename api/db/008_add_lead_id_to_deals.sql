-- Migration 008: Add lead_id to deals table
-- This migration adds a lead_id column to the deals table to link deals to leads
-- Safe to run multiple times (idempotent)

-- ==============================================
-- Add lead_id column to deals table
-- ==============================================
DO $$
BEGIN
    -- Add lead_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deals' AND column_name = 'lead_id'
    ) THEN
        ALTER TABLE deals ADD COLUMN lead_id UUID REFERENCES leads(id);
    END IF;
END $$;

-- ==============================================
-- Add index for performance
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_deals_lead_id ON deals(lead_id);

