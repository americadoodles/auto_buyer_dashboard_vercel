-- Migration 012: Remove unreferenced vehicles
-- This script removes vehicles that are not referenced by any other table
-- 
-- A vehicle is considered unreferenced if it's not referenced by:
-- - listings table
-- - scores table
-- - lead_vehicles table (CRM)
-- - deal_vehicles table (CRM)
--
-- IMPORTANT: Review the results before executing the DELETE statement!

-- Step 1: Count unreferenced vehicles (for review)
SELECT COUNT(*) as unreferenced_count
FROM vehicles v
WHERE NOT EXISTS (
    SELECT 1 FROM listings l WHERE l.vehicle_key = v.vehicle_key
)
AND NOT EXISTS (
    SELECT 1 FROM scores s WHERE s.vehicle_key = v.vehicle_key
)
AND NOT EXISTS (
    SELECT 1 FROM lead_vehicles lv WHERE lv.vehicle_key = v.vehicle_key
)
AND NOT EXISTS (
    SELECT 1 FROM deal_vehicles dv WHERE dv.vehicle_key = v.vehicle_key
);

-- Step 2: Preview unreferenced vehicles (first 100 for review)
SELECT 
    v.vehicle_key,
    v.vin,
    v.year,
    v.make,
    v.model,
    v.trim
FROM vehicles v
WHERE NOT EXISTS (
    SELECT 1 FROM listings l WHERE l.vehicle_key = v.vehicle_key
)
AND NOT EXISTS (
    SELECT 1 FROM scores s WHERE s.vehicle_key = v.vehicle_key
)
AND NOT EXISTS (
    SELECT 1 FROM lead_vehicles lv WHERE lv.vehicle_key = v.vehicle_key
)
AND NOT EXISTS (
    SELECT 1 FROM deal_vehicles dv WHERE dv.vehicle_key = v.vehicle_key
)
ORDER BY v.vehicle_key
LIMIT 100;

-- Step 3: DELETE unreferenced vehicles
-- UNCOMMENT THE FOLLOWING BLOCK TO ACTUALLY DELETE THE VEHICLES
-- Review the count and preview queries above before running this!

/*
DELETE FROM vehicles
WHERE NOT EXISTS (
    SELECT 1 FROM listings l WHERE l.vehicle_key = vehicles.vehicle_key
)
AND NOT EXISTS (
    SELECT 1 FROM scores s WHERE s.vehicle_key = vehicles.vehicle_key
)
AND NOT EXISTS (
    SELECT 1 FROM lead_vehicles lv WHERE lv.vehicle_key = vehicles.vehicle_key
)
AND NOT EXISTS (
    SELECT 1 FROM deal_vehicles dv WHERE dv.vehicle_key = vehicles.vehicle_key
);
*/
