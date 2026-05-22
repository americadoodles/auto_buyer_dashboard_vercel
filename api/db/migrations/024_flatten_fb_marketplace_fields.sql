-- Migration 024: Flatten the remaining FB Marketplace fields onto listings
--
-- Completes the FB Marketplace flattening pass. Every meaningful field from the
-- FB payload is now a typed column. Pure FB internals (origin_target, story.*,
-- commercial flags like is_buy_now_enabled, etc.) are intentionally NOT
-- columnized -- they have no business-query value.
--
-- Idempotent.

-- ============================================================
-- Title + seller classification
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS custom_title           TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS dealership_name        TEXT;

-- ============================================================
-- Delivery / inventory
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS delivery_types         TEXT[];
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_inventory_type TEXT;

-- ============================================================
-- Geo (extends 023)
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS country                TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS city_display_name      TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS fb_city_id             TEXT;

-- ============================================================
-- Lifecycle (extends 023)
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_on_marketplace      BOOLEAN;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_draft               BOOLEAN;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS fb_is_hidden           BOOLEAN;

-- ============================================================
-- Vehicle attributes
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_condition      TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_title_status   TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_features       TEXT[];
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_number_of_owners INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS vehicle_is_paid_off    BOOLEAN;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS odometer_unit          TEXT;

-- ============================================================
-- Vehicle specifications (numeric)
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS horse_power            NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS gas_mileage_city       NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS gas_mileage_highway    NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS gas_mileage_combined   NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS co2_emissions          NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS safety_rating_overall  NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS safety_rating_front    NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS safety_rating_side     NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS safety_rating_rollover NUMERIC;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS safety_rating_side_barrier NUMERIC;

-- Note: engine_size already exists on listings.
