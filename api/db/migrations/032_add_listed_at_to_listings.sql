-- Migration 032: Add listed_at to listings (dynamic Days-on-Market)
--
-- Problem: listings.dom stored a NUMERIC day count captured at ingest time, so
-- it never aged — a listing saved as "30 days" still showed 30 a week later.
--
-- Fix: store the marketplace listing START as a timestamp (listed_at) and
-- derive DOM = now() - listed_at at read time. This migration adds the column
-- and backfills it from the best timestamp available per row:
--   1. fb_creation_time  — the real Facebook Marketplace listing time, if known
--   2. created_at - dom  — reconstruct the original list date from the stale
--                          snapshot (created_at is when WE first ingested it)
--   3. created_at / now()— last-resort fallbacks
--
-- Safe to run multiple times (idempotent): the column add is guarded and the
-- backfill only touches rows where listed_at is still NULL.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'listed_at'
    ) THEN
        ALTER TABLE listings ADD COLUMN listed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Backfill only rows that don't yet have a listed_at.
UPDATE listings
SET listed_at = COALESCE(
        fb_creation_time,
        created_at - make_interval(days => GREATEST(COALESCE(dom, 0), 0)),
        created_at,
        now()
    )
WHERE listed_at IS NULL;

-- DOM is queried/sorted frequently; index the source timestamp.
CREATE INDEX IF NOT EXISTS idx_listings_listed_at ON listings(listed_at);
