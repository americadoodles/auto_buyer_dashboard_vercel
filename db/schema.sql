create table if not exists vehicles (
  vehicle_key text primary key,
  vin text,
  year int,
  make text,
  model text,
  trim text
);

create table if not exists listings (
  id serial primary key,
  vehicle_key text references vehicles(vehicle_key),
  vin text,
  source text,
  price numeric,
  miles int,
  dom int,
  location text,
  buyer_id text,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists scores (
  id serial primary key,
  vehicle_key text references vehicles(vehicle_key),
  vin text,
  score int check (score between 0 and 100),
  buy_max numeric,
  reason_codes text[],
  created_at timestamptz default now()
);

create or replace view v_latest_scores as
select distinct on (vehicle_key) vehicle_key, vin, score, buy_max, reason_codes, created_at
from scores
order by vehicle_key, created_at desc;

-- Add indexes for better performance
create index if not exists idx_listings_vehicle_key on listings(vehicle_key);
create index if not exists idx_listings_vin on listings(vin);
create index if not exists idx_scores_vehicle_key on scores(vehicle_key);
create index if not exists idx_scores_vin on scores(vin);
create index if not exists idx_vehicles_vin on vehicles(vin);

-- User authentication and management

-- Roles table for scalable role management
create table if not exists roles (
  id serial primary key,
  name text unique not null,
  description text
);

-- Users table with role_id foreign key
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text not null,
  hashed_password text not null,
  role_id int references roles(id) not null,
  is_confirmed boolean not null default false,
  created_at timestamptz default now()
);

-- Signup requests for buyers (pending admin confirmation)
create table if not exists user_signup_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  username text not null,
  password text not null,
  role_id int references roles(id) not null,
  requested_at timestamptz default now()
);

-- Add indexes for user management
create index if not exists idx_users_email on users(email);
create index if not exists idx_users_username on users(username);
create index if not exists idx_users_role_id on users(role_id);
create index if not exists idx_signup_requests_email on user_signup_requests(email);
create index if not exists idx_signup_requests_username on user_signup_requests(username);
create index if not exists idx_signup_requests_role_id on user_signup_requests(role_id);
