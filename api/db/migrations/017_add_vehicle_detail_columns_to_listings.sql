-- Migration 017: Add missing vehicle detail columns to listings table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'interior_color'
    ) THEN
        ALTER TABLE listings ADD COLUMN interior_color TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'exterior_color'
    ) THEN
        ALTER TABLE listings ADD COLUMN exterior_color TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'transmission'
    ) THEN
        ALTER TABLE listings ADD COLUMN transmission TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'fuel_type'
    ) THEN
        ALTER TABLE listings ADD COLUMN fuel_type TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'drivetrain'
    ) THEN
        ALTER TABLE listings ADD COLUMN drivetrain TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'body_style'
    ) THEN
        ALTER TABLE listings ADD COLUMN body_style TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE listings ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE listings ADD COLUMN updated_by TEXT;
    END IF;
END $$;
