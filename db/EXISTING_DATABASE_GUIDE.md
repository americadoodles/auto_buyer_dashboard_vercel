# Running Migrations on Existing Databases

## ✅ Yes, these migrations will work with existing databases!

All migrations are designed to be **idempotent** and **safe for existing databases**. Here's what you need to know:

## Safety Features

### 1. **Table Creation**
- All tables use `CREATE TABLE IF NOT EXISTS`
- Existing tables are **not modified** or **dropped**
- Only missing tables are created

### 2. **Column Addition**
- Uses `ADD COLUMN IF NOT EXISTS` where applicable
- Existing columns are **not modified** or **removed**
- Only missing columns are added

### 3. **Index Creation**
- All indexes use `CREATE INDEX IF NOT EXISTS`
- Existing indexes are **not dropped** or recreated
- Only missing indexes are created

### 4. **Data Preservation**
- **No data is deleted** by these migrations
- Updates only set default values where needed
- Foreign key constraints are added safely

## Migration Behavior by File

### 000_base_schema.sql
- ✅ Creates tables only if they don't exist
- ✅ Creates indexes only if they don't exist
- ✅ Replaces views (safe operation, doesn't affect data)
- ⚠️ **Note**: If `users` table exists without `role_id`, migration 002 will add it

### 001_seed_roles.sql
- ✅ Uses `ON CONFLICT DO NOTHING` - won't duplicate roles
- ✅ Safe to run multiple times

### 002_migrate_users_role.sql
- ✅ **Handles all scenarios**:
  - Users table with old `role` column → migrates to `role_id`
  - Users table without `role_id` → adds `role_id` column
  - Users table already has `role_id` → no changes
- ✅ Preserves existing user data
- ✅ Sets default role for users without role_id

### 003_add_user_activity.sql
- ✅ Uses `ADD COLUMN IF NOT EXISTS`
- ✅ Sets initial `last_login` from `created_at` if null
- ✅ Safe for existing users

### 004_crm_schema.sql
- ✅ All tables use `CREATE TABLE IF NOT EXISTS`
- ✅ All indexes use `CREATE INDEX IF NOT EXISTS`
- ✅ Views use `CREATE OR REPLACE` (safe)
- ✅ **No existing tables are modified**

### 005_seed_crm_data.sql
- ✅ Removes duplicates before creating unique indexes
- ✅ Uses `WHERE NOT EXISTS` for all inserts
- ✅ Safe to run multiple times

## Scenarios Handled

### Scenario 1: Fresh Database
✅ All migrations run successfully, creating everything from scratch

### Scenario 2: Database with Old Schema (users with `role` column)
✅ Migration 002 detects old `role` column, migrates to `role_id`, preserves data

### Scenario 3: Database with Partial Schema (some tables exist)
✅ Only missing tables/columns/indexes are created

### Scenario 4: Database Already Has CRM Tables
✅ Migrations skip existing tables, only add missing ones

### Scenario 5: Database with Existing Data
✅ All existing data is preserved, only schema additions are made

## Potential Issues & Solutions

### Issue 1: Users Table Without role_id Column
**Status**: ✅ **FIXED** - Migration 002 now ensures `role_id` column exists

### Issue 2: Foreign Key Constraints on Existing Data
**Status**: ✅ **HANDLED** - Migrations only add constraints if they don't exist, and ensure referenced data exists first (e.g., roles are seeded before users are updated)

### Issue 3: Duplicate Data in Lookup Tables
**Status**: ✅ **HANDLED** - Migration 005 removes duplicates before creating unique indexes

### Issue 4: Missing Roles for Users
**Status**: ✅ **HANDLED** - Migration 002 sets default 'buyer' role for users without role_id

## Testing Recommendations

Before running on production:

1. **Backup your database** (always!)
   ```bash
   pg_dump your_database > backup.sql
   ```

2. **Test on a copy first**
   ```bash
   createdb test_database
   psql test_database < backup.sql
   # Run migrations on test_database
   ```

3. **Verify data integrity**
   ```sql
   -- Check user counts
   SELECT COUNT(*) FROM users;
   
   -- Check role assignments
   SELECT r.name, COUNT(u.id) 
   FROM roles r 
   LEFT JOIN users u ON u.role_id = r.id 
   GROUP BY r.name;
   
   -- Check existing data
   SELECT COUNT(*) FROM listings;
   SELECT COUNT(*) FROM scores;
   ```

## Running on Existing Database

### Step 1: Backup
```bash
pg_dump your_database > backup_before_migration.sql
```

### Step 2: Run Migrations
```bash
# Option 1: Use the script
./db/run_migrations.sh your_database

# Option 2: Run manually
psql -d your_database -f db/000_base_schema.sql
psql -d your_database -f db/001_seed_roles.sql
psql -d your_database -f db/002_migrate_users_role.sql
psql -d your_database -f db/003_add_user_activity.sql
psql -d your_database -f db/004_crm_schema.sql
psql -d your_database -f db/005_seed_crm_data.sql
```

### Step 3: Verify
```sql
-- Check that all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify users have role_id
SELECT COUNT(*) as users_without_role 
FROM users 
WHERE role_id IS NULL;
-- Should return 0

-- Check roles are seeded
SELECT * FROM roles;
```

## Rollback Plan

If something goes wrong:

1. **Restore from backup**
   ```bash
   dropdb your_database
   createdb your_database
   psql your_database < backup_before_migration.sql
   ```

2. **Or manually revert** (if needed):
   - The migrations don't drop tables, so your data is safe
   - You may need to manually remove added columns if needed

## Summary

✅ **Safe for existing databases**
✅ **Preserves all existing data**
✅ **Idempotent (can run multiple times)**
✅ **Handles all common scenarios**
⚠️ **Always backup first!**

