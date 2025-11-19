#!/bin/bash
# Migration Runner Script
# Runs all migrations in the correct order

set -e  # Exit on error

DB_NAME="${1:-your_database}"
DB_USER="${2:-postgres}"
DB_HOST="${3:-localhost}"

echo "Running migrations for database: $DB_NAME"
echo "=========================================="

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Run migrations in order
echo "Running 000_base_schema.sql..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f db/000_base_schema.sql

echo "Running 001_seed_roles.sql..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f db/001_seed_roles.sql

echo "Running 002_migrate_users_role.sql..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f db/002_migrate_users_role.sql

echo "Running 003_add_user_activity.sql..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f db/003_add_user_activity.sql

echo "Running 004_crm_schema.sql..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f db/004_crm_schema.sql

echo "Running 006_add_contact_id_to_leads.sql..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f db/006_add_contact_id_to_leads.sql

echo "Running 005_seed_crm_data.sql..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f db/005_seed_crm_data.sql

echo ""
echo "=========================================="
echo "All migrations completed successfully!"
echo "=========================================="

