-- Migration 002: Migrate Users to Role-Based System
-- Handles migration from old role column to role_id foreign key
-- Run after 001_seed_roles.sql
-- This migration is idempotent and safe to run multiple times

-- Update existing users table if it has old structure
-- This handles the case where the old 'role' column might exist
DO $$
BEGIN
  -- Check if old 'role' column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    -- Add role_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role_id'
    ) THEN
      ALTER TABLE users ADD COLUMN role_id int;
    END IF;
    
    -- Update role_id based on existing role values
    UPDATE users SET role_id = (SELECT id FROM roles WHERE name = users.role) WHERE role_id IS NULL;
    
    -- Drop old role column
    ALTER TABLE users DROP COLUMN role;
  END IF;
END $$;

-- Ensure all users have valid role_id
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'buyer') WHERE role_id IS NULL;

-- Make role_id NOT NULL (if not already)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_role_id_fkey'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id);
  END IF;
END $$;

