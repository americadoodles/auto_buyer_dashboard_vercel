-- Migration 021: Link listings to contacts; move FB seller fields to contacts
--
-- Adds:
--   - contacts.fb_user_id      (FB Marketplace seller user_id; dedupe key when phone is null)
--   - contacts.fb_joined_date  (renamed home for listings.seller_joined_date)
--   - listings.contact_id      (direct FK to seller contact)
--
-- Backfills via the existing leads-mediated link (leads.listing_id / leads.contact_id).
--
-- Compatibility note:
--   listings.seller_joined_date, seller_name, phone_number are KEPT (deprecated).
--   Ingestion continues to write them; a later migration can drop them once
--   read paths consume contacts directly.
--
-- Idempotent.

-- ============================================================
-- Step 1: New columns
-- ============================================================
ALTER TABLE contacts  ADD COLUMN IF NOT EXISTS fb_user_id     TEXT;
ALTER TABLE contacts  ADD COLUMN IF NOT EXISTS fb_joined_date TEXT;
ALTER TABLE listings  ADD COLUMN IF NOT EXISTS contact_id     UUID REFERENCES contacts(id);

-- ============================================================
-- Step 2: Backfill listings.contact_id from leads
-- ============================================================
UPDATE listings l
SET contact_id = ld.contact_id
FROM leads ld
WHERE ld.listing_id = l.id
  AND l.contact_id IS NULL
  AND ld.contact_id IS NOT NULL;

-- ============================================================
-- Step 3: Backfill contacts.fb_joined_date from listings (via leads)
--   Guarded: skips once migration 022 drops listings.seller_joined_date.
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'seller_joined_date'
    ) THEN
        UPDATE contacts c
        SET fb_joined_date = l.seller_joined_date
        FROM leads ld
        JOIN listings l ON l.id = ld.listing_id
        WHERE ld.contact_id = c.id
          AND c.fb_joined_date IS NULL
          AND l.seller_joined_date IS NOT NULL;
    END IF;
END $$;

-- ============================================================
-- Step 4: Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contacts_fb_user_id ON contacts(fb_user_id);
CREATE INDEX IF NOT EXISTS idx_listings_contact_id ON listings(contact_id);
