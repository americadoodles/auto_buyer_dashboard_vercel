-- Migration 022: Drop denormalized seller_* columns from listings
--
-- After migration 021, seller info lives on contacts (joined via
-- listings.contact_id). The columns below are no longer source-of-truth.
--
-- Idempotent.

ALTER TABLE listings DROP COLUMN IF EXISTS seller_joined_date;
ALTER TABLE listings DROP COLUMN IF EXISTS seller_name;
ALTER TABLE listings DROP COLUMN IF EXISTS phone_number;
