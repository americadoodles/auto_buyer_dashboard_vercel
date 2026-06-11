-- Migration 028: Damage Detection Agent
--
-- Adds:
--   * damage_reports : one AI-generated damage report per listing (jsonb payload)
--   * agent_state    : persisted control state for background agents so that
--                      start / pause / resume / stop survives server restarts
--
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS damage_reports (
  id              SERIAL PRIMARY KEY,
  listing_id      INT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | completed | failed
  report          JSONB,                            -- structured damage report (null until completed)
  model           TEXT,                             -- vision model used (e.g. gpt-4o-mini)
  images_analyzed INT NOT NULL DEFAULT 0,
  error           TEXT,                             -- failure reason when status = 'failed'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One report per listing — reruns upsert in place.
CREATE UNIQUE INDEX IF NOT EXISTS ux_damage_reports_listing_id
  ON damage_reports(listing_id);

CREATE INDEX IF NOT EXISTS idx_damage_reports_status
  ON damage_reports(status);

CREATE TABLE IF NOT EXISTS agent_state (
  agent_id        TEXT PRIMARY KEY,                 -- e.g. 'damage-detection'
  status          TEXT NOT NULL DEFAULT 'idle',     -- idle | running | paused | stopped | completed | error
  cursor_listing_id INT,                            -- last successfully processed listing id (resume point)
  total           INT NOT NULL DEFAULT 0,           -- listings targeted by the current run
  processed       INT NOT NULL DEFAULT 0,
  succeeded       INT NOT NULL DEFAULT 0,
  failed          INT NOT NULL DEFAULT 0,
  last_error      TEXT,
  started_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
