-- Minimal migration: Add listing editing functionality
-- Add new columns to listings table for editable fields
ALTER TABLE listings ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();
ALTER TABLE listings ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS condition_rating int;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS interior_color text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS exterior_color text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS transmission text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS fuel_type text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS drivetrain text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS engine_size text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS body_style text;

-- Create listing_contacts junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS listing_contacts (
  id serial primary key,
  listing_id int references listings(id) on delete cascade,
  contact_id uuid,
  relationship_type text not null default 'seller',
  is_primary boolean default false,
  notes text,
  created_at timestamptz default now(),
  created_by text
);

-- Create listing_activities table for tracking changes
CREATE TABLE IF NOT EXISTS listing_activities (
  id serial primary key,
  listing_id int references listings(id) on delete cascade,
  activity_type text not null,
  field_name text,
  old_value text,
  new_value text,
  description text,
  created_at timestamptz default now(),
  created_by text
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_listing_contacts_listing_id ON listing_contacts(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_contacts_contact_id ON listing_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_listing_activities_listing_id ON listing_activities(listing_id);
CREATE INDEX IF NOT EXISTS idx_listings_updated_at ON listings(updated_at);
CREATE INDEX IF NOT EXISTS idx_listings_updated_by ON listings(updated_by);
