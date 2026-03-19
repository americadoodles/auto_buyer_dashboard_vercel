-- Migration 010: Add additional listing fields
-- This migration adds new columns to the listings table for additional vehicle and seller information
-- Safe to run multiple times (idempotent)

-- ==============================================
-- Add new columns to listings table
-- ==============================================
DO $$
BEGIN
    -- Add cleanTitle column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'clean_title'
    ) THEN
        ALTER TABLE listings ADD COLUMN clean_title BOOLEAN;
    END IF;

    -- Add condition column if it doesn't exist (different from condition_rating)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'condition'
    ) THEN
        ALTER TABLE listings ADD COLUMN condition TEXT;
    END IF;

    -- Add detailedRatings column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'detailed_ratings'
    ) THEN
        ALTER TABLE listings ADD COLUMN detailed_ratings JSONB;
    END IF;

    -- Add engine column if it doesn't exist (different from engine_size)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'engine'
    ) THEN
        ALTER TABLE listings ADD COLUMN engine TEXT;
    END IF;

    -- Add mpg column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'mpg'
    ) THEN
        ALTER TABLE listings ADD COLUMN mpg TEXT;
    END IF;

    -- Add overallRating column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'overall_rating'
    ) THEN
        ALTER TABLE listings ADD COLUMN overall_rating TEXT;
    END IF;

    -- Add paidStatus column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'paid_status'
    ) THEN
        ALTER TABLE listings ADD COLUMN paid_status TEXT;
    END IF;

    -- Add phoneNumber column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE listings ADD COLUMN phone_number TEXT;
    END IF;

    -- Add sellerDescription column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'seller_description'
    ) THEN
        ALTER TABLE listings ADD COLUMN seller_description TEXT;
    END IF;

    -- Add sellerJoinedDate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'seller_joined_date'
    ) THEN
        ALTER TABLE listings ADD COLUMN seller_joined_date TEXT;
    END IF;

    -- Add sellerName column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'listings' AND column_name = 'seller_name'
    ) THEN
        ALTER TABLE listings ADD COLUMN seller_name TEXT;
    END IF;
END $$;

-- ==============================================
-- Add indexes for commonly queried fields (optional)
-- ==============================================
-- CREATE INDEX IF NOT EXISTS idx_listings_clean_title ON listings(clean_title);
-- CREATE INDEX IF NOT EXISTS idx_listings_overall_rating ON listings(overall_rating);
-- CREATE INDEX IF NOT EXISTS idx_listings_seller_name ON listings(seller_name);

