-- Migration 018: Add is_hidden column to deals table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'deals' AND column_name = 'is_hidden'
    ) THEN
        ALTER TABLE deals ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
