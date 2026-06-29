-- Migration 012: Add lpn_state column to listings table
-- Stores the issuing US state / Canadian province (2-letter code) of the
-- vehicle's license plate, as read from listing photos by the damage-detection
-- agent. Companion to the lpn (License Plate Number) column from migration 011.
-- Safe to run multiple times (idempotent).

-- ==============================================
-- Add lpn_state column to listings table
-- ==============================================
DO $$
BEGIN
    -- Add lpn_state column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'lpn_state'
    ) THEN
        ALTER TABLE listings ADD COLUMN lpn_state TEXT;
    END IF;
END $$;
