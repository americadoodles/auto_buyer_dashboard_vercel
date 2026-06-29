-- Migration 027: Repair listings.id (SERIAL default + uniqueness)
--
-- schema.sql declares `id serial primary key` on listings, but on the live
-- Cloud SQL database that definition drifted:
--   1. the column's DEFAULT (nextval) is missing -- INSERTs that omit `id`
--      fail with: null value in column "id" violates not-null constraint
--   2. the PRIMARY KEY / UNIQUE constraint on `id` is missing -- foreign keys
--      that reference listings(id) (e.g. damage_reports in migration 028) fail
--      with: there is no unique constraint matching given keys for referenced
--      table "listings"
--
-- This restores the sequence + DEFAULT, resyncs the sequence past any existing
-- rows, and re-adds a uniqueness constraint on id. Safe to run multiple times.

-- Create the sequence if it doesn't exist, owned by listings.id so it gets
-- dropped automatically if the column ever is.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'listings_id_seq' AND relkind = 'S'
    ) THEN
        CREATE SEQUENCE listings_id_seq OWNED BY listings.id;
    END IF;
END $$;

-- (Re)attach the sequence as the column default.
ALTER TABLE listings ALTER COLUMN id SET DEFAULT nextval('listings_id_seq'::regclass);

-- Resync the sequence so the next nextval() does not collide with existing PKs.
-- - Empty table: setval(seq, 1, false) -> next nextval() returns 1
-- - Non-empty:   setval(seq, MAX(id), true) -> next nextval() returns MAX(id)+1
DO $$
DECLARE
    max_id BIGINT;
BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM listings;
    IF max_id > 0 THEN
        PERFORM setval('listings_id_seq', max_id, true);
    ELSE
        PERFORM setval('listings_id_seq', 1, false);
    END IF;
END $$;

-- Re-add a uniqueness constraint on listings.id so foreign keys can reference
-- it (migration 028's damage_reports.listing_id, etc.). Postgres requires the
-- referenced column to carry a PRIMARY KEY or UNIQUE *constraint* (a bare unique
-- index is not enough). Guarded: only added when no PK/UNIQUE constraint on
-- exactly (id) already exists, so it is idempotent and never collides with an
-- existing primary key on fresh databases.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.listings'::regclass
          AND contype IN ('p', 'u')
          AND conkey = ARRAY[
              (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'public.listings'::regclass
                 AND attname = 'id'
                 AND NOT attisdropped)::smallint
          ]
    ) THEN
        ALTER TABLE public.listings ADD CONSTRAINT uq_listings_id UNIQUE (id);
    END IF;
END $$;
