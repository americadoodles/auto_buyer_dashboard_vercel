-- Migration 020: Drop lead_vehicles and deal_vehicles
--
-- These tables were designed as M2M links between leads/deals and the
-- (now-removed) vehicles table, but were never wired up in application code.
-- leads.listing_id and deals.lead_id already provide all the linkage the CRM
-- actually uses.
--
-- Safe to run multiple times (idempotent).

DROP TABLE IF EXISTS lead_vehicles;
DROP TABLE IF EXISTS deal_vehicles;
