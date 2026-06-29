-- Migration 014: Create mmr_data table
-- This migration creates a table to store MMR (Manheim Market Report) data including features, transactions, historical averages, projected averages, and estimated retail
-- Safe to run multiple times (idempotent)

-- ==============================================
-- Create mmr_data table (if not exists)
-- ==============================================
CREATE TABLE IF NOT EXISTS mmr_data (
    id SERIAL PRIMARY KEY,
    vin TEXT NOT NULL,
    features JSONB,
    transactions JSONB,
    historical_average JSONB,
    projected_average JSONB,
    estimated_retail JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Add indexes for better performance
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_mmr_data_vin ON mmr_data(vin);

-- ==============================================
-- Add comments for documentation
-- ==============================================
COMMENT ON TABLE mmr_data IS 'Stores MMR (Manheim Market Report) data including features, transactions, historical averages, projected averages, and estimated retail';
COMMENT ON COLUMN mmr_data.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN mmr_data.vin IS 'Vehicle Identification Number, references listings.vin';
COMMENT ON COLUMN mmr_data.features IS 'JSONB field storing MMR features (Base MMR, Avg Odometer, Avg Condition, Avg EV Battery Score)';
COMMENT ON COLUMN mmr_data.transactions IS 'JSONB array storing transaction history (date, price, odometer, grade, etc.)';
COMMENT ON COLUMN mmr_data.historical_average IS 'JSONB field storing historical average data (Past 30 Days, 6 Months Ago, Last Year)';
COMMENT ON COLUMN mmr_data.projected_average IS 'JSONB field storing projected average data (Next Month, etc.)';
COMMENT ON COLUMN mmr_data.estimated_retail IS 'JSONB field storing estimated retail information (Retail, Typical Range)';
COMMENT ON COLUMN mmr_data.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN mmr_data.updated_at IS 'Timestamp when the record was last updated';

-- ==============================================
-- Create function to automatically update updated_at timestamp
-- ==============================================
CREATE OR REPLACE FUNCTION update_mmr_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- Create trigger to automatically update updated_at
-- ==============================================
DROP TRIGGER IF EXISTS trigger_update_mmr_data_updated_at ON mmr_data;
CREATE TRIGGER trigger_update_mmr_data_updated_at
    BEFORE UPDATE ON mmr_data
    FOR EACH ROW
    EXECUTE FUNCTION update_mmr_data_updated_at();
