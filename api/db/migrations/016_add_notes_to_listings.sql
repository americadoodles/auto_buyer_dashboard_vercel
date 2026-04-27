-- Migration 016: Add notes column to listings table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'notes'
    ) THEN
        ALTER TABLE listings ADD COLUMN notes TEXT;
    END IF;
END $$;
