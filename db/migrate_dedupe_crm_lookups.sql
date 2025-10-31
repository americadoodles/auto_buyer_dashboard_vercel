-- Migration script to remove duplicate entries from CRM lookup tables
-- before creating unique case-insensitive indexes
-- This fixes the error: "could not create unique index ... Key (lower(name))=(referral) is duplicated"

-- ==============================================
-- CLEANUP DUPLICATES IN LEAD_SOURCES
-- ==============================================
-- Remove duplicates, keeping the entry with the lowest ID
DELETE FROM lead_sources
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
        FROM lead_sources
    ) t
    WHERE rn > 1
);

-- ==============================================
-- CLEANUP DUPLICATES IN LEAD_STATUSES
-- ==============================================
DELETE FROM lead_statuses
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
        FROM lead_statuses
    ) t
    WHERE rn > 1
);

-- ==============================================
-- CLEANUP DUPLICATES IN CONTACT_TYPES
-- ==============================================
DELETE FROM contact_types
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
        FROM contact_types
    ) t
    WHERE rn > 1
);

-- ==============================================
-- CLEANUP DUPLICATES IN DEAL_STAGES
-- ==============================================
DELETE FROM deal_stages
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
        FROM deal_stages
    ) t
    WHERE rn > 1
);

-- ==============================================
-- CLEANUP DUPLICATES IN DEAL_CATEGORIES
-- ==============================================
DELETE FROM deal_categories
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
        FROM deal_categories
    ) t
    WHERE rn > 1
);

-- ==============================================
-- CLEANUP DUPLICATES IN TASK_PRIORITIES
-- ==============================================
DELETE FROM task_priorities
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
        FROM task_priorities
    ) t
    WHERE rn > 1
);

-- ==============================================
-- CLEANUP DUPLICATES IN TASK_STATUSES
-- ==============================================
DELETE FROM task_statuses
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
        FROM task_statuses
    ) t
    WHERE rn > 1
);

-- ==============================================
-- CLEANUP DUPLICATES IN KPI_DEFINITIONS
-- ==============================================
DELETE FROM kpi_definitions
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY id) as rn
        FROM kpi_definitions
    ) t
    WHERE rn > 1
);

-- ==============================================
-- NOW CREATE UNIQUE INDEXES (should work after cleanup)
-- ==============================================
-- Drop existing indexes if they exist (in case they're partial/broken)
DROP INDEX IF EXISTS ux_lead_sources_name_ci;
DROP INDEX IF EXISTS ux_lead_statuses_name_ci;
DROP INDEX IF EXISTS ux_contact_types_name_ci;
DROP INDEX IF EXISTS ux_deal_stages_name_ci;
DROP INDEX IF EXISTS ux_deal_categories_name_ci;
DROP INDEX IF EXISTS ux_task_priorities_name_ci;
DROP INDEX IF EXISTS ux_task_statuses_name_ci;
DROP INDEX IF EXISTS ux_kpi_definitions_name_ci;

-- Create unique case-insensitive indexes
CREATE UNIQUE INDEX ux_lead_sources_name_ci ON lead_sources (LOWER(name));
CREATE UNIQUE INDEX ux_lead_statuses_name_ci ON lead_statuses (LOWER(name));
CREATE UNIQUE INDEX ux_contact_types_name_ci ON contact_types (LOWER(name));
CREATE UNIQUE INDEX ux_deal_stages_name_ci ON deal_stages (LOWER(name));
CREATE UNIQUE INDEX ux_deal_categories_name_ci ON deal_categories (LOWER(name));
CREATE UNIQUE INDEX ux_task_priorities_name_ci ON task_priorities (LOWER(name));
CREATE UNIQUE INDEX ux_task_statuses_name_ci ON task_statuses (LOWER(name));
CREATE UNIQUE INDEX ux_kpi_definitions_name_ci ON kpi_definitions (LOWER(name));

