-- Migration 029: Damage Detection Agent — run configuration & scope skipping
--
-- * agent_state.run_config : jsonb run parameters (ingested date range, ...)
--                            persisted so pause/resume keeps the same filters
-- * agent_state.skipped    : listings analyzed but out of scope (not a
--                            passenger / light commercial vehicle)
--
-- damage_reports.status gains the value 'skipped' (TEXT column — no DDL needed).
--
-- Idempotent: safe to run multiple times.

ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS run_config JSONB;
ALTER TABLE agent_state ADD COLUMN IF NOT EXISTS skipped INT NOT NULL DEFAULT 0;

-- Speeds up the date-range candidate scan.
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);
