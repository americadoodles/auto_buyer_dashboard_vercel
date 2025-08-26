import os
from typing import Optional
from .config import settings

try:
    import psycopg
    _psycopg_available = True
except Exception:
    psycopg = None  # type: ignore
    _psycopg_available = False

DB_ENABLED: bool = bool(settings.DATABASE_URL and _psycopg_available)

def get_conn() -> Optional["psycopg.Connection"]:
    if not DB_ENABLED:
        return None
    assert psycopg is not None
    # Always require SSL on Vercel/Neon; add if caller forgot.
    dsn = settings.DATABASE_URL
    if "sslmode=" not in dsn:
        sep = "&" if "?" in dsn else "?"
        dsn = f"{dsn}{sep}sslmode=require"
    # Keep a short timeout to avoid hanging cold starts
    return psycopg.connect(settings.DATABASE_URL, autocommit=True)  # type: ignore

def apply_schema_if_needed() -> None:
    if not DB_ENABLED:
        return
    conn = get_conn()
    assert conn is not None
    cur = conn.cursor()
    try:
        # Try file first
        import pathlib, logging
        schema_path = pathlib.Path(__file__).parents[2] / "db" / "schema.sql"
        if schema_path.exists():
            logging.info("Applying schema from %s", schema_path)
            cur.execute(schema_path.read_text(encoding="utf-8"))
        else:
            logging.info("Applying inline schema (fallback)")
            cur.execute("""
                create table if not exists vehicles (
                  vin text primary key,
                  year int, make text, model text, trim text
                );
                create table if not exists listings (
                  id serial primary key,
                  vin text references vehicles(vin),
                  source text, price numeric, miles int, dom int,
                  payload jsonb, created_at timestamptz default now()
                );
                create table if not exists scores (
                  id serial primary key,
                  vin text references vehicles(vin),
                  score int check (score between 0 and 100),
                  buy_max numeric,
                  reason_codes text[],
                  created_at timestamptz default now()
                );
                create or replace view v_latest_scores as
                select distinct on (vin) vin, score, buy_max, reason_codes, created_at
                from scores
                order by vin, created_at desc;
            """)
        logging.info("Schema ensured OK")
    finally:
        cur.close()
        conn.close()
