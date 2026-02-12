-- Migration 013: Create accu_trade_data table
-- This migration creates a table to store vehicle market data including options, pricebar, local market listing, and market stats
-- Safe to run multiple times (idempotent)

-- ==============================================
-- Create accu_trade_data table (if not exists)
-- ==============================================
CREATE TABLE IF NOT EXISTS accu_trade_data (
    id SERIAL PRIMARY KEY,
    vin TEXT NOT NULL,
    options JSONB,
    pricebar JSONB,
    local_market_listing JSONB,
    local_market_stats JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- Add indexes for better performance
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_accu_trade_data_vin ON accu_trade_data(vin);

-- ==============================================
-- Add comments for documentation
-- ==============================================
COMMENT ON TABLE accu_trade_data IS 'Stores vehicle market data including options, pricing information, local market listings, and market statistics';
COMMENT ON COLUMN accu_trade_data.id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN accu_trade_data.vin IS 'Vehicle Identification Number, references listings.vin';
COMMENT ON COLUMN accu_trade_data.options IS 'JSONB field storing vehicle options and their prices';
COMMENT ON COLUMN accu_trade_data.pricebar IS 'JSONB field storing pricing information (Instant Offer, Target Auction, MMR, Trade In, Target Retail)';
COMMENT ON COLUMN accu_trade_data.local_market_listing IS 'JSONB field storing local market listing information (age, dealership, vehicle details, etc.)';
COMMENT ON COLUMN accu_trade_data.local_market_stats IS 'JSONB field storing local market statistics (Median Price, Median Odometer, Median DOM, Market Day Supply)';
COMMENT ON COLUMN accu_trade_data.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN accu_trade_data.updated_at IS 'Timestamp when the record was last updated';

-- ==============================================
-- Create function to automatically update updated_at timestamp
-- ==============================================
CREATE OR REPLACE FUNCTION update_accu_trade_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- Create trigger to automatically update updated_at
-- ==============================================
DROP TRIGGER IF EXISTS trigger_update_accu_trade_data_updated_at ON accu_trade_data;
CREATE TRIGGER trigger_update_accu_trade_data_updated_at
    BEFORE UPDATE ON accu_trade_data
    FOR EACH ROW
    EXECUTE FUNCTION update_accu_trade_data_updated_at();
