-- Migration 015: Create condition_reports table
-- This migration creates a table to store vehicle condition report data
-- Safe to run multiple times (idempotent)

-- ==============================================
-- Create condition_reports table if it doesn't exist
-- ==============================================
CREATE TABLE IF NOT EXISTS condition_reports (
    id SERIAL PRIMARY KEY,
    vin TEXT NOT NULL,
    sections JSONB NOT NULL,
    key_value_pairs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Add new columns if they don't exist
-- ==============================================
DO $$
BEGIN
    -- Add vehicle_info column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'condition_reports' AND column_name = 'vehicle_info'
    ) THEN
        ALTER TABLE condition_reports ADD COLUMN vehicle_info JSONB;
    END IF;

    -- Add equipment_options column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'condition_reports' AND column_name = 'equipment_options'
    ) THEN
        ALTER TABLE condition_reports ADD COLUMN equipment_options JSONB;
    END IF;

    -- Add pricing_breakdown column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'condition_reports' AND column_name = 'pricing_breakdown'
    ) THEN
        ALTER TABLE condition_reports ADD COLUMN pricing_breakdown JSONB;
    END IF;
END $$;

-- ==============================================
-- Add indexes for better performance
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_condition_reports_vin ON condition_reports(vin);
CREATE INDEX IF NOT EXISTS idx_condition_reports_created_at ON condition_reports(created_at);

-- ==============================================
-- Add comments for documentation
-- ==============================================
COMMENT ON TABLE condition_reports IS 'Stores vehicle condition report data including sections, key-value pairs, vehicle info, equipment options, and pricing breakdown';
COMMENT ON COLUMN condition_reports.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN condition_reports.vin IS 'Vehicle Identification Number';
COMMENT ON COLUMN condition_reports.sections IS 'JSONB field storing condition report sections (odometer, options, damage, etc.)';
COMMENT ON COLUMN condition_reports.key_value_pairs IS 'JSONB field storing summary key-value pairs';
COMMENT ON COLUMN condition_reports.vehicle_info IS 'JSONB field storing vehicle information (year/make/model, style, VIN, miles, AutoCheck status, instant offer)';
COMMENT ON COLUMN condition_reports.equipment_options IS 'JSONB field storing equipment options and common problems';
COMMENT ON COLUMN condition_reports.pricing_breakdown IS 'JSONB field storing pricing breakdown details (base, odometer, options, deductions, recon)';
COMMENT ON COLUMN condition_reports.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN condition_reports.updated_at IS 'Timestamp when the record was last updated';

-- ==============================================
-- Create function to automatically update updated_at timestamp
-- ==============================================
CREATE OR REPLACE FUNCTION update_condition_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- Create trigger to automatically update updated_at
-- ==============================================
DROP TRIGGER IF EXISTS trigger_update_condition_reports_updated_at ON condition_reports;
CREATE TRIGGER trigger_update_condition_reports_updated_at
    BEFORE UPDATE ON condition_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_condition_reports_updated_at();
