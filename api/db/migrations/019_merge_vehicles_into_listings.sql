-- Migration 019: Merge vehicles table into listings
--
-- Inlines year/make/model/trim from the vehicles table onto listings, and
-- repoints scores / lead_vehicles / deal_vehicles to link via vin (soft link,
-- no FK) instead of vehicle_key. Drops the vehicles table at the end.
--
-- Compatibility note:
--   listings.vehicle_key and scores.vehicle_key columns are KEPT (only their
--   FKs to vehicles are dropped) because repositories.py still writes to them.
--   A follow-up code PR should remove those writes; a later migration can then
--   drop the columns themselves.
--
-- Safe to run multiple times (idempotent).

-- ============================================================
-- Step 1: Add year/make/model/trim columns to listings
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='year') THEN
        ALTER TABLE listings ADD COLUMN year INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='make') THEN
        ALTER TABLE listings ADD COLUMN make TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='model') THEN
        ALTER TABLE listings ADD COLUMN model TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='trim') THEN
        ALTER TABLE listings ADD COLUMN trim TEXT;
    END IF;
END $$;

-- ============================================================
-- Step 2: Backfill listings.year/make/model/trim from vehicles
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='vehicles') THEN
        UPDATE listings
        SET year  = COALESCE(listings.year,  v.year),
            make  = COALESCE(listings.make,  v.make),
            model = COALESCE(listings.model, v.model),
            trim  = COALESCE(listings.trim,  v.trim)
        FROM vehicles v
        WHERE listings.vehicle_key = v.vehicle_key
          AND (listings.year IS NULL OR listings.make IS NULL
               OR listings.model IS NULL OR listings.trim IS NULL);
    END IF;
END $$;

-- ============================================================
-- Step 3: Switch lead_vehicles from vehicle_key to vin
--   - Add vin column, backfill via vehicles, drop vehicle_key column (and its FK)
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_vehicles' AND column_name='vin') THEN
        ALTER TABLE lead_vehicles ADD COLUMN vin TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='vehicles')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lead_vehicles' AND column_name='vehicle_key') THEN
        UPDATE lead_vehicles lv
        SET vin = v.vin
        FROM vehicles v
        WHERE lv.vehicle_key = v.vehicle_key
          AND lv.vin IS NULL;
    END IF;
END $$;

ALTER TABLE lead_vehicles DROP COLUMN IF EXISTS vehicle_key;
CREATE INDEX IF NOT EXISTS idx_lead_vehicles_vin ON lead_vehicles(vin);

-- ============================================================
-- Step 4: Switch deal_vehicles from vehicle_key to vin (same shape as Step 3)
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deal_vehicles' AND column_name='vin') THEN
        ALTER TABLE deal_vehicles ADD COLUMN vin TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='vehicles')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='deal_vehicles' AND column_name='vehicle_key') THEN
        UPDATE deal_vehicles dv
        SET vin = v.vin
        FROM vehicles v
        WHERE dv.vehicle_key = v.vehicle_key
          AND dv.vin IS NULL;
    END IF;
END $$;

ALTER TABLE deal_vehicles DROP COLUMN IF EXISTS vehicle_key;
CREATE INDEX IF NOT EXISTS idx_deal_vehicles_vin ON deal_vehicles(vin);

-- ============================================================
-- Step 5: Drop FK from scores.vehicle_key to vehicles (keep the column)
--   scores.vin is the new logical link to listings.
-- ============================================================
DO $$
DECLARE fk_name TEXT;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'scores'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE '%REFERENCES vehicles%';
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE scores DROP CONSTRAINT %I', fk_name);
    END IF;
END $$;

-- Rebuild v_latest_scores to dedupe on vin
DROP VIEW IF EXISTS v_latest_scores;
CREATE VIEW v_latest_scores AS
SELECT DISTINCT ON (vin) vin, score, buy_max, reason_codes, created_at
FROM scores
WHERE vin IS NOT NULL
ORDER BY vin, created_at DESC;

-- ============================================================
-- Step 6: Drop FK from listings.vehicle_key to vehicles (keep the column)
-- ============================================================
DO $$
DECLARE fk_name TEXT;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'listings'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) ILIKE '%REFERENCES vehicles%';
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE listings DROP CONSTRAINT %I', fk_name);
    END IF;
END $$;

-- ============================================================
-- Step 7: Drop the vehicles table
--   All inbound FKs (listings, scores, lead_vehicles, deal_vehicles) have
--   been removed above; drop should succeed without CASCADE.
-- ============================================================
DROP TABLE IF EXISTS vehicles;
