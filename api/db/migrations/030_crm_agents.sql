-- Migration 030: Generic AI agent reports
--
-- One reports table shared by all CRM agents (lead-scoring, deal-risk,
-- followup-drafter, task-generator). entity_id is TEXT because CRM entities
-- (leads, deals, contacts) use UUID primary keys while listings use ints.
--
-- The damage-detection agent keeps its dedicated damage_reports table; its
-- API responses are normalized to this generic shape at the route layer.
--
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS agent_reports (
  id           SERIAL PRIMARY KEY,
  agent_id     TEXT NOT NULL,                    -- e.g. 'lead-scoring'
  entity_type  TEXT NOT NULL,                    -- 'lead' | 'deal' | 'contact'
  entity_id    TEXT NOT NULL,                    -- uuid or int, stored as text
  entity_label TEXT,                             -- human-readable label for UI/console
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | completed | failed | skipped
  report       JSONB,                            -- structured agent output
  model        TEXT,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One report per (agent, entity) — reruns upsert in place.
CREATE UNIQUE INDEX IF NOT EXISTS ux_agent_reports_agent_entity
  ON agent_reports(agent_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_agent_reports_agent_status
  ON agent_reports(agent_id, status);
