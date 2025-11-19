# Database Migration Order

This document describes the correct order for running database migrations.

## Migration Files (in order)

1. **000_base_schema.sql** - Base schema with vehicles, listings, scores, roles, users, and user_signup_requests
2. **001_seed_roles.sql** - Seeds default roles (admin, buyer, analyst)
3. **002_migrate_users_role.sql** - Migrates users from old role column to role_id (idempotent)
4. **003_add_user_activity.sql** - Adds last_login field to users table
5. **004_crm_schema.sql** - Creates full CRM schema (leads, contacts, deals, tasks, etc.)
6. **005_seed_crm_data.sql** - Seeds default CRM data and creates unique indexes

## Running Migrations

### For Fresh Database
Run all migrations in order:
```bash
psql -d your_database -f db/000_base_schema.sql
psql -d your_database -f db/001_seed_roles.sql
psql -d your_database -f db/002_migrate_users_role.sql
psql -d your_database -f db/003_add_user_activity.sql
psql -d your_database -f db/004_crm_schema.sql
psql -d your_database -f db/005_seed_crm_data.sql
```

### For Existing Database
All migrations are idempotent and can be run multiple times safely. Run them in order.

## Legacy Migration Files

The following files are now consolidated into the numbered migrations above:
- `migrate_users.sql` → Consolidated into `002_migrate_users_role.sql`
- `migrate_roles.sql` → Consolidated into `002_migrate_users_role.sql`
- `migrate_signup_role.sql` → Already handled in `000_base_schema.sql` (user_signup_requests has role_id)
- `migrate_user_activity.sql` → Consolidated into `003_add_user_activity.sql`
- `migrate_kanban_tasks.sql` → Consolidated into `004_crm_schema.sql`
- `migrate_leads_restructure.sql` → Not needed (leads table in `004_crm_schema.sql` already has correct structure)
- `migrate_dedupe_crm_lookups.sql` → Consolidated into `005_seed_crm_data.sql`
- `crm_schema.sql` → Consolidated into `004_crm_schema.sql` and `005_seed_crm_data.sql`

## Notes

- All migrations use `IF NOT EXISTS` and `ON CONFLICT` clauses to be idempotent
- The schema.sql file is kept for reference but should not be used for migrations (use numbered files instead)
- Migrations handle both fresh installs and upgrades from existing databases

