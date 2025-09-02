-- Migration: Add role_id to user_signup_requests and set default to 'buyer' role
ALTER TABLE user_signup_requests ADD COLUMN role_id INT;

-- Set default role_id to 'buyer' for existing rows
UPDATE user_signup_requests SET role_id = (
    SELECT id FROM roles WHERE name = 'buyer' LIMIT 1
) WHERE role_id IS NULL;

-- Set NOT NULL constraint and foreign key
ALTER TABLE user_signup_requests ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE user_signup_requests ADD CONSTRAINT fk_signup_role FOREIGN KEY (role_id) REFERENCES roles(id);
