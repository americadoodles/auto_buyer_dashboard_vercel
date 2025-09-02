-- Migration script to update user tables
-- Run this after updating the main schema.sql

-- Ensure roles table exists and has basic roles
INSERT INTO roles (name, description) VALUES 
  ('admin', 'Administrator with full access') 
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES 
  ('buyer', 'Buyer with limited access') 
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES 
  ('analyst', 'Analyst with read access') 
ON CONFLICT (name) DO NOTHING;

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

-- Make role_id NOT NULL
ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

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
