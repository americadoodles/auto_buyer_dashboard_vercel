-- Migration 000: Base Schema
-- This is the foundation schema for the auto-buyer platform
-- Run this first before any other migrations

-- Note: the vehicles table was merged into listings in migration 019.
-- year/make/model/trim now live on listings directly.
-- listings.vehicle_key and scores.vehicle_key are retained as plain TEXT
-- (no FK) for legacy callers; they are slated for removal in a later migration.

create table if not exists listings (
  id serial primary key,
  vehicle_key text,
  vin text,
  source text,
  price numeric,
  miles int,
  dom int,
  location text,
  buyer_id text,
  payload jsonb,
  images text[],
  notes text,
  interior_color text,
  exterior_color text,
  transmission text,
  fuel_type text,
  drivetrain text,
  body_style text,
  year int,
  make text,
  model text,
  trim text,
  updated_at timestamptz,
  updated_by text,
  created_at timestamptz default now()
);

create table if not exists scores (
  id serial primary key,
  vehicle_key text,
  vin text,
  score int check (score between 0 and 100),
  buy_max numeric,
  reason_codes text[],
  created_at timestamptz default now()
);

create or replace view v_latest_scores as
select distinct on (vin) vin, score, buy_max, reason_codes, created_at
from scores
where vin is not null
order by vin, created_at desc;

-- Add indexes for better performance
create index if not exists idx_listings_vehicle_key on listings(vehicle_key);
create index if not exists idx_listings_vin on listings(vin);
create index if not exists idx_scores_vehicle_key on scores(vehicle_key);
create index if not exists idx_scores_vin on scores(vin);

-- User authentication and management

-- Roles table for scalable role management
create table if not exists roles (
  id serial primary key,
  name text unique not null,
  description text,
  created_at timestamptz default now()
);

-- Users table with role_id foreign key
-- Note: If users table exists without role_id, migration 002 will add it
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text not null,
  hashed_password text not null,
  role_id int, -- Will be set to NOT NULL and FK in migration 002
  is_confirmed boolean not null default false,
  created_at timestamptz default now()
);

-- Signup requests for buyers (pending admin confirmation)
-- Note: role_id FK constraint will be added in migration 002
create table if not exists user_signup_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  username text not null,
  password text not null,
  role_id int, -- Will be set to NOT NULL and FK in migration 002
  requested_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Add indexes for user management
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_username on users(username);
create index if not exists idx_users_role_id on users(role_id);
create index if not exists idx_signup_requests_email on user_signup_requests(email);
create index if not exists idx_signup_requests_username on user_signup_requests(username);
create index if not exists idx_signup_requests_role_id on user_signup_requests(role_id);

