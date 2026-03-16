-- Migration 001: Seed Default Roles
-- Seeds the roles table with default roles
-- Run after 000_base_schema.sql

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

