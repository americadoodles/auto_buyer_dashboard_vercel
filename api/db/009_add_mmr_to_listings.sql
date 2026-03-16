-- Migration 009: Add mmr column to listings table
-- This migration adds an mmr (Manheim Market Report) column to the listings table
-- Safe to run multiple times (idempotent)

-- ==============================================
-- Add mmr column to listings table
-- ==============================================
DO $$
BEGIN
    -- Add mmr column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'mmr'
    ) THEN
        ALTER TABLE listings ADD COLUMN mmr NUMERIC;
    END IF;
END $$;

-- ==============================================
-- Add index for performance (optional, if you plan to query by mmr)
-- ==============================================
-- CREATE INDEX IF NOT EXISTS idx_listings_mmr ON listings(mmr);

