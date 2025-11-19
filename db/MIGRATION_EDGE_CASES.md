# Migration Edge Cases - All Scenarios Covered

This document lists all edge cases that have been handled to ensure migrations run without errors.

## ✅ Fixed Issues

### 1. **000_base_schema.sql**
- ✅ **Issue**: `users` table created with `role_id int references roles(id) not null` would fail if table already exists without role_id
- ✅ **Fix**: Changed to nullable `role_id int` without FK constraint. Migration 002 adds constraint safely.
- ✅ **Issue**: Same issue with `user_signup_requests`
- ✅ **Fix**: Same approach - nullable role_id, constraint added in 002

### 2. **002_migrate_users_role.sql**
- ✅ **Issue**: UPDATE might fail if 'buyer' role doesn't exist
- ✅ **Fix**: Added check to ensure 'buyer' role exists before using it
- ✅ **Issue**: Setting NOT NULL might fail if NULL values exist
- ✅ **Fix**: Only set NOT NULL if no NULL values exist
- ✅ **Issue**: FK constraint might fail if invalid role_id values exist
- ✅ **Fix**: Clean up invalid role_id values before adding constraint
- ✅ **Issue**: user_signup_requests table not handled
- ✅ **Fix**: Added complete handling for user_signup_requests table

### 3. **003_add_user_activity.sql**
- ✅ **Issue**: UPDATE might fail if `created_at` column doesn't exist
- ✅ **Fix**: Check for column existence, fallback to NOW() if missing

### 4. **004_crm_schema.sql**
- ✅ **Issue**: Views reference tables that might not exist
- ✅ **Status**: Views are created after all tables, so safe. Uses CREATE OR REPLACE.
- ✅ **Issue**: Indexes on columns that might not exist
- ✅ **Status**: Indexes use IF NOT EXISTS and are created after tables

### 5. **005_seed_crm_data.sql**
- ✅ **Issue**: DELETE operations fail if tables don't exist
- ✅ **Fix**: Wrapped all DELETE operations in table existence checks
- ✅ **Issue**: CREATE INDEX fails if table doesn't exist
- ✅ **Fix**: Wrapped index creation in table existence checks
- ✅ **Issue**: INSERT operations fail if tables don't exist
- ✅ **Fix**: Wrapped all INSERT operations in table existence checks

## Tested Scenarios

### Scenario 1: Fresh Database
✅ All migrations run successfully from scratch

### Scenario 2: Database with Old Schema (users with `role` column)
✅ Migration 002 detects and migrates old role column

### Scenario 3: Database with Partial Schema
✅ Only missing tables/columns/indexes are created

### Scenario 4: Database Already Has CRM Tables
✅ Migrations skip existing tables, only add missing ones

### Scenario 5: Database with Existing Data
✅ All existing data is preserved

### Scenario 6: Database with Invalid Foreign Keys
✅ Invalid role_id values are cleaned up before adding constraints

### Scenario 7: Database Missing Required Roles
✅ Roles are created if missing before being used

### Scenario 8: Database with NULL role_id Values
✅ NULL values are set to default 'buyer' role before NOT NULL constraint

### Scenario 9: Database with Duplicate Lookup Data
✅ Duplicates are removed before creating unique indexes

### Scenario 10: Database Missing created_at Column
✅ Migration 003 handles missing created_at gracefully

### Scenario 11: Database with Partial CRM Schema
✅ Migration 005 only operates on existing tables

## Safety Features

1. **All table operations**: Use `IF NOT EXISTS` or existence checks
2. **All column operations**: Use `IF NOT EXISTS` or existence checks  
3. **All index operations**: Use `IF NOT EXISTS` or existence checks
4. **All constraint operations**: Check for existence before adding
5. **All data operations**: Check for table existence before operating
6. **All foreign key operations**: Validate data before adding constraints
7. **All NOT NULL operations**: Ensure no NULLs exist before adding constraint
8. **All INSERT operations**: Use `ON CONFLICT` or `WHERE NOT EXISTS`
9. **All DELETE operations**: Wrapped in table existence checks
10. **All UPDATE operations**: Check for column/table existence

## Error Prevention

- ✅ No operations on non-existent tables
- ✅ No operations on non-existent columns
- ✅ No duplicate constraint creation
- ✅ No invalid foreign key references
- ✅ No NOT NULL constraints on columns with NULLs
- ✅ No duplicate data insertion
- ✅ No operations that would fail on partial schema

## Idempotency

All migrations are **fully idempotent**:
- Can be run multiple times safely
- No side effects on repeated execution
- Safe to run on any database state
- Handles all edge cases gracefully

