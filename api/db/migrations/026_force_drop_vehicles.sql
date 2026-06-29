-- Migration 026: Force-drop legacy vehicles tables.
--
-- Migration 019 ended with `DROP TABLE IF EXISTS vehicles;` (no CASCADE) and
-- migration 020 did the same for lead_vehicles/deal_vehicles. On deployed
-- databases with leftover FKs or views still pointing at these tables, those
-- DROPs failed and the migration runner's try/except swallowed the error,
-- leaving the tables behind. This migration uses CASCADE to clean up
-- unconditionally. Idempotent.

DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS lead_vehicles CASCADE;
DROP TABLE IF EXISTS deal_vehicles CASCADE;
