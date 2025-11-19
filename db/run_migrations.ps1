# Migration Runner Script for PowerShell
# Runs all migrations in the correct order

param(
    [string]$Database = "your_database",
    [string]$User = "postgres",
    [string]$Host = "localhost"
)

Write-Host "Running migrations for database: $Database" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "Error: psql command not found. Please install PostgreSQL client tools." -ForegroundColor Red
    exit 1
}

# Run migrations in order
Write-Host "Running 000_base_schema.sql..." -ForegroundColor Yellow
psql -h $Host -U $User -d $Database -f db/000_base_schema.sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running 001_seed_roles.sql..." -ForegroundColor Yellow
psql -h $Host -U $User -d $Database -f db/001_seed_roles.sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running 002_migrate_users_role.sql..." -ForegroundColor Yellow
psql -h $Host -U $User -d $Database -f db/002_migrate_users_role.sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running 003_add_user_activity.sql..." -ForegroundColor Yellow
psql -h $Host -U $User -d $Database -f db/003_add_user_activity.sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running 004_crm_schema.sql..." -ForegroundColor Yellow
psql -h $Host -U $User -d $Database -f db/004_crm_schema.sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Running 005_seed_crm_data.sql..." -ForegroundColor Yellow
psql -h $Host -U $User -d $Database -f db/005_seed_crm_data.sql
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "All migrations completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

