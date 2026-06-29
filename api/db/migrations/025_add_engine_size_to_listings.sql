-- Migration 025: Add missing engine_size column to listings
--
-- repositories.py:ingest_listings() inserts into listings.engine_size, and
-- migration 024 has a comment claiming "engine_size already exists on listings",
-- but no prior migration actually adds the column. On fresh local DBs the
-- INSERT fails with: column "engine_size" of relation "listings" does not exist.
--
-- Idempotent.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS engine_size TEXT;
