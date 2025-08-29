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
  buyer text,
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
