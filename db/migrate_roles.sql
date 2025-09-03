-- Remove old role column if exists
ALTER TABLE users DROP COLUMN IF EXISTS role;
-- Add new role_id column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id int REFERENCES roles(id);
-- Update existing users to set role_id based on previous role value
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'admin') WHERE email = 'ben@opulentintelligence.com';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'buyer') WHERE role_id IS NULL AND email != 'ben@opulentintelligence.com';
-- You may need to adjust the above logic for other roles and users as needed.
