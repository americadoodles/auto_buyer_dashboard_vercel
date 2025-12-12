-- Migration 011: Add lpn column to listings table
-- This migration adds the lpn (License Plate Number) column to the listings table
-- Safe to run multiple times (idempotent)

-- ==============================================
-- Add lpn column to listings table
-- ==============================================
DO $$
BEGIN
    -- Add lpn column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'lpn'
    ) THEN
        ALTER TABLE listings ADD COLUMN lpn TEXT;
    END IF;
END $$;

-- ==============================================
-- Add index for lpn if needed (optional)
-- ==============================================
-- CREATE INDEX IF NOT EXISTS idx_listings_lpn ON listings(lpn);

