-- Migration 003: Add User Activity Tracking
-- Adds last_login field to users table
-- Run after 002_migrate_users_role.sql

-- Add last_login field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Add index for better performance on last_login queries
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Update existing users to have their created_at as last_login (best approximation)
UPDATE users SET last_login = created_at WHERE last_login IS NULL;

