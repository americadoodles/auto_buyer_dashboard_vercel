-- Migration 023: Add FB Marketplace fields to listings and contacts
--
-- Persists the high-signal fields from the Facebook Marketplace payload:
--   - canonical FB listing ID + title + category (car-vs-equipment classifier)
--   - currency + FB-side creation time
--   - normalized geo (city/state/postal/lat/lng)
--   - lifecycle flags (is_live / is_sold / is_pending)
--   - seller type (PRIVATE_SELLER vs DEALER)
--   - seller trust signals on contacts (rating, count, verified badge)
--
-- Lower-value flags and nested FB structures stay in listings.payload JSONB.
--
-- Idempotent.

-- ============================================================
-- listings: FB identity + classification
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS fb_listing_id           TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS title                   TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS marketplace_category_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS currency                TEXT;

-- listings: timestamps
ALTER TABLE listings ADD COLUMN IF NOT EXISTS fb_creation_time        TIMESTAMPTZ;

-- listings: geo
ALTER TABLE listings ADD COLUMN IF NOT EXISTS city                    TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS state                   TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS postal_code             TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS latitude                NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS longitude               NUMERIC;

-- listings: lifecycle
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_live                 BOOLEAN;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_sold                 BOOLEAN;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_pending              BOOLEAN;

-- listings: seller classification
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_type             TEXT;

-- ============================================================
-- contacts: seller trust signals
-- ============================================================
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fb_seller_rating        NUMERIC;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fb_seller_rating_count  INTEGER;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS fb_verified             BOOLEAN;

-- ============================================================
-- Indexes
-- ============================================================
-- Partial UNIQUE: enforces dedupe on FB listing id when present; legacy rows
-- without fb_listing_id are allowed to be NULL freely.
CREATE UNIQUE INDEX IF NOT EXISTS ux_listings_fb_listing_id
    ON listings(fb_listing_id) WHERE fb_listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_marketplace_category_id
    ON listings(marketplace_category_id);

CREATE INDEX IF NOT EXISTS idx_listings_city_state
    ON listings(city, state);

CREATE INDEX IF NOT EXISTS idx_listings_is_live
    ON listings(is_live) WHERE is_live IS TRUE;
