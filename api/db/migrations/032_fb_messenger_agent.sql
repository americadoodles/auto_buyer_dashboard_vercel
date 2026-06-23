-- Migration 032: FB Messenger Agent
--
-- Like the FB Marketplace Scraper agent (031), this agent is driven by a
-- Chrome extension connected over the same per-user WebSocket
-- (/ws/extensions/fb-scraper) — it reads and sends Facebook Marketplace
-- seller messages on the user's behalf.
--
-- messenger_threads: one row per Messenger conversation with a seller.
-- messenger_messages: the individual messages within a thread, in/outbound.
--
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS messenger_threads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id         UUID REFERENCES contacts(id),       -- seller, when matched to a contact
  listing_id         INT REFERENCES listings(id),        -- listing the thread is about, if known
  fb_thread_id       TEXT NOT NULL,                       -- FB Messenger thread id (dedupe key)
  seller_name        TEXT NOT NULL,                       -- display fallback when contact_id is null
  seller_profile_url TEXT,
  ai_mode            TEXT NOT NULL DEFAULT 'auto',         -- 'auto' | 'paused' (per-thread kill switch)
  unread_count       INT NOT NULL DEFAULT 0,
  last_message_at    TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, fb_thread_id)
);

CREATE TABLE IF NOT EXISTS messenger_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     UUID NOT NULL REFERENCES messenger_threads(id) ON DELETE CASCADE,
  direction     TEXT NOT NULL,                   -- 'inbound' | 'outbound'
  sender        TEXT NOT NULL DEFAULT 'human',    -- 'seller' | 'ai' | 'human'
  body          TEXT NOT NULL,
  fb_message_id TEXT,
  status        TEXT NOT NULL DEFAULT 'sent',     -- 'queued' | 'sent' | 'delivered' | 'failed'
  error         TEXT,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messenger_threads_user
  ON messenger_threads(user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messenger_messages_thread
  ON messenger_messages(thread_id, created_at);
