-- Migration 031: FB Marketplace Scraper Agent
--
-- The scraper agent is driven by a Chrome extension running in the user's
-- browser, connected over WebSocket. Unlike damage-detection and the CRM
-- agents (which are global singletons), this agent's state is per-user:
-- each buyer controls their own extension instance.
--
-- Stores: last-used filters (so the dashboard form persists across sessions),
-- the current run status, and rolling counters reported by the extension.
--
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS fb_scraper_state (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'idle',     -- idle | running | stopped | completed | error
  filters      JSONB,                            -- last-used scraper filters
  total        INT  NOT NULL DEFAULT 0,          -- listings the extension said it would attempt
  processed    INT  NOT NULL DEFAULT 0,          -- listings parsed
  succeeded    INT  NOT NULL DEFAULT 0,          -- forwarded to /api/ingest/facebook ok
  failed       INT  NOT NULL DEFAULT 0,
  skipped      INT  NOT NULL DEFAULT 0,
  last_error   TEXT,
  started_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fb_scraper_state_status
  ON fb_scraper_state(status);
