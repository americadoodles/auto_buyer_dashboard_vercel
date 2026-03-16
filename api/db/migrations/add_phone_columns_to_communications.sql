-- Migration: Add phone number columns to communications table for SMS/Call tracking
-- Run this migration to enable incoming SMS and call tracking

-- Add columns for storing phone numbers and external IDs (e.g., Twilio Message SID, Call SID)
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS from_phone TEXT,
ADD COLUMN IF NOT EXISTS to_phone TEXT,
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add index for faster lookups by phone number
CREATE INDEX IF NOT EXISTS idx_communications_from_phone ON communications(from_phone);
CREATE INDEX IF NOT EXISTS idx_communications_to_phone ON communications(to_phone);
CREATE INDEX IF NOT EXISTS idx_communications_external_id ON communications(external_id);

-- Add index for faster lookups by direction and type
CREATE INDEX IF NOT EXISTS idx_communications_direction_type ON communications(direction, communication_type);
