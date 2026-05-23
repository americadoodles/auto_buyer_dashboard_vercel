-- Migration 026: Repair listings.id SERIAL default
--
-- schema.sql declares `id serial primary key` on listings, but on the live
-- Cloud SQL database the column's DEFAULT (nextval) is missing -- INSERTs
-- that omit `id` fail with:
--   null value in column "id" of relation "listings" violates not-null constraint
--
-- This restores the sequence + DEFAULT and resyncs the sequence past any
-- existing rows. Safe to run multiple times.

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
