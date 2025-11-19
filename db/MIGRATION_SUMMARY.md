# Database Migration Summary

## Overview

The database migrations have been reorganized into a numbered sequence to ensure proper execution order and eliminate conflicts. All migrations are idempotent and can be safely run multiple times.

## Migration Files (Execution Order)

### 000_base_schema.sql
**Purpose**: Creates the foundation schema
- Vehicles table
- Listings table
- Scores table and view
- Roles table
- Users table (with role_id foreign key)
- User signup requests table
- All necessary indexes

### 001_seed_roles.sql
**Purpose**: Seeds default roles
- Admin role
- Buyer role
- Analyst role

### 002_migrate_users_role.sql
**Purpose**: Migrates existing users from old role column to role_id
- Handles migration from old `role` text column to `role_id` foreign key
- Idempotent - safe to run multiple times
- Updates existing users to have valid role_id

### 003_add_user_activity.sql
**Purpose**: Adds user activity tracking
- Adds `last_login` column to users table
- Creates index on last_login
- Updates existing users with created_at as initial last_login

### 004_crm_schema.sql
**Purpose**: Creates comprehensive CRM functionality
- Contact management (contact_types, contacts, contact_activities)
- Lead management (lead_sources, lead_statuses, leads, lead_activities)
- Deal management (deal_stages, deal_categories, deals, deal_activities)
- Task management (task_boards, task_columns, tasks, task_activity) - Kanban structure
- Communication (email_templates, communications)
- Analytics (kpi_definitions, kpi_measurements)
- Vehicle integration (lead_vehicles, deal_vehicles)
- All necessary indexes and views

### 005_seed_crm_data.sql
**Purpose**: Seeds default CRM data
- Removes duplicates from lookup tables
- Creates unique case-insensitive indexes
- Seeds default lead sources, statuses, contact types
- Seeds default deal stages and categories
- Creates default task boards and columns
- Seeds default KPI definitions

## Key Fixes Applied

1. **Table Creation Order**: Fixed dependency issue where `leads` table was created before `contacts`, causing foreign key constraint errors. Contacts are now created first.

2. **Consolidated Duplicate Migrations**:
   - `migrate_users.sql` and `migrate_roles.sql` → `002_migrate_users_role.sql`
   - `migrate_user_activity.sql` → `003_add_user_activity.sql`
   - `migrate_kanban_tasks.sql` → Integrated into `004_crm_schema.sql`
   - `migrate_dedupe_crm_lookups.sql` → Integrated into `005_seed_crm_data.sql`
   - `crm_schema.sql` → Split into `004_crm_schema.sql` and `005_seed_crm_data.sql`

3. **Removed Redundant Migration**: `migrate_leads_restructure.sql` is no longer needed as `004_crm_schema.sql` already creates leads with the correct structure.

4. **Idempotency**: All migrations use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, and conditional logic to be safely re-runnable.

## Running Migrations

### Option 1: Using the Script (Recommended)

**Linux/Mac:**
```bash
chmod +x db/run_migrations.sh
./db/run_migrations.sh your_database postgres localhost
```

**Windows (PowerShell):**
```powershell
.\db\run_migrations.ps1 -Database "your_database" -User "postgres" -Host "localhost"
```

### Option 2: Manual Execution

Run each migration file in order:
```bash
psql -d your_database -f db/000_base_schema.sql
psql -d your_database -f db/001_seed_roles.sql
psql -d your_database -f db/002_migrate_users_role.sql
psql -d your_database -f db/003_add_user_activity.sql
psql -d your_database -f db/004_crm_schema.sql
psql -d your_database -f db/005_seed_crm_data.sql
```

## Legacy Files

The following legacy migration files are kept for reference but should not be used:
- `schema.sql` - Use `000_base_schema.sql` instead
- `migrate_users.sql` - Consolidated into `002_migrate_users_role.sql`
- `migrate_roles.sql` - Consolidated into `002_migrate_users_role.sql`
- `migrate_signup_role.sql` - No longer needed (handled in base schema)
- `migrate_user_activity.sql` - Consolidated into `003_add_user_activity.sql`
- `migrate_kanban_tasks.sql` - Consolidated into `004_crm_schema.sql`
- `migrate_leads_restructure.sql` - No longer needed
- `migrate_dedupe_crm_lookups.sql` - Consolidated into `005_seed_crm_data.sql`
- `crm_schema.sql` - Split into `004_crm_schema.sql` and `005_seed_crm_data.sql`

## Verification

After running migrations, verify the schema:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check roles are seeded
SELECT * FROM roles;

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;
```

## Notes

- All migrations are designed to be idempotent
- Foreign key constraints are properly ordered
- Indexes are created for performance
- Views are created for common queries
- Default data is seeded for lookup tables

