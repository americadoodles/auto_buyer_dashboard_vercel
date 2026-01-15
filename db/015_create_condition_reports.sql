-- Migration 015: Create condition_reports table
-- This migration creates a table to store vehicle condition report data
-- Safe to run multiple times (idempotent)

-- ==============================================
-- Drop old condition_reports table if it exists
-- ==============================================
DROP TABLE IF EXISTS condition_reports CASCADE;

-- Drop old function and trigger if they exist
DROP FUNCTION IF EXISTS update_condition_reports_updated_at() CASCADE;

-- ==============================================
-- Create condition_reports table
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
-- Add indexes for better performance
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_condition_reports_vin ON condition_reports(vin);
CREATE INDEX IF NOT EXISTS idx_condition_reports_created_at ON condition_reports(created_at);

-- ==============================================
-- Add comments for documentation
-- ==============================================
COMMENT ON TABLE condition_reports IS 'Stores vehicle condition report data including sections and key-value pairs';
COMMENT ON COLUMN condition_reports.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN condition_reports.vin IS 'Vehicle Identification Number';
COMMENT ON COLUMN condition_reports.sections IS 'JSONB field storing condition report sections (odometer, options, damage, etc.)';
COMMENT ON COLUMN condition_reports.key_value_pairs IS 'JSONB field storing summary key-value pairs';
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
