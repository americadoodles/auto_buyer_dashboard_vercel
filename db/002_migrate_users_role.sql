-- Migration 002: Migrate Users to Role-Based System
-- Handles migration from old role column to role_id foreign key
-- Run after 001_seed_roles.sql
-- This migration is idempotent and safe to run multiple times

-- Ensure role_id column exists (add if it doesn't)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE users ADD COLUMN role_id int;
  END IF;
END $$;

-- Update existing users table if it has old structure
-- This handles the case where the old 'role' column might exist
DO $$
BEGIN
  -- Check if old 'role' column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    -- Update role_id based on existing role values
    UPDATE users SET role_id = (SELECT id FROM roles WHERE name = users.role) WHERE role_id IS NULL;
    
    -- Drop old role column
    ALTER TABLE users DROP COLUMN role;
  END IF;
END $$;

-- Ensure 'buyer' role exists (should be seeded in 001, but check anyway)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'buyer') THEN
    INSERT INTO roles (name, description) VALUES ('buyer', 'Buyer with limited access')
    ON CONFLICT (name) DO NOTHING;
  END IF;
END $$;

-- Ensure all users have valid role_id (default to 'buyer' if not set)
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'buyer' LIMIT 1) 
WHERE role_id IS NULL;

-- Make role_id NOT NULL (if not already and no NULL values exist)
DO $$
BEGIN
  -- Only set NOT NULL if there are no NULL values
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role_id'
    AND is_nullable = 'YES'
  ) AND NOT EXISTS (SELECT 1 FROM users WHERE role_id IS NULL) THEN
    ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
-- First ensure all role_id values are valid
DO $$
BEGIN
  -- Update any invalid role_id values to 'buyer'
  UPDATE users 
  SET role_id = (SELECT id FROM roles WHERE name = 'buyer' LIMIT 1)
  WHERE role_id IS NOT NULL 
  AND role_id NOT IN (SELECT id FROM roles);
END $$;

-- Now add the constraint
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

-- Handle user_signup_requests table similarly
DO $$
BEGIN
  -- Add role_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_signup_requests' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE user_signup_requests ADD COLUMN role_id int;
  END IF;
  
  -- Set default role_id for existing rows
  UPDATE user_signup_requests 
  SET role_id = (SELECT id FROM roles WHERE name = 'buyer' LIMIT 1) 
  WHERE role_id IS NULL;
  
  -- Make NOT NULL if no NULLs exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_signup_requests' AND column_name = 'role_id'
    AND is_nullable = 'YES'
  ) AND NOT EXISTS (SELECT 1 FROM user_signup_requests WHERE role_id IS NULL) THEN
    ALTER TABLE user_signup_requests ALTER COLUMN role_id SET NOT NULL;
  END IF;
  
  -- Add FK constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_signup_requests_role_id_fkey'
  ) THEN
    ALTER TABLE user_signup_requests ADD CONSTRAINT user_signup_requests_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id);
  END IF;
END $$;

