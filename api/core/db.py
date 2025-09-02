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

def seed_default_roles(conn) -> None:
    """Seed default roles if they don't exist"""
    try:
        with conn.cursor() as cur:
            # Check if roles table has any data
            cur.execute("SELECT COUNT(*) FROM roles")
            roles_count = cur.fetchone()[0]
            print(f"Current roles count: {roles_count}")
            
            if roles_count == 0:
                # Insert default roles
                default_roles = [
                    ("admin", "Full access to all features"),
                    ("buyer", "Can buy and view listings"),
                    ("analyst", "Can view and score listings")
                ]
                for name, description in default_roles:
                    cur.execute(
                        "INSERT INTO roles (name, description) VALUES (%s, %s)",
                        (name, description)
                    )
                    print(f"Inserted role: {name}")
                print("Default roles seeded successfully")
            else:
                # Check what roles exist
                cur.execute("SELECT name FROM roles ORDER BY id")
                existing_roles = [row[0] for row in cur.fetchall()]
                print(f"Existing roles: {existing_roles}")
                
                # Ensure buyer role exists
                if "buyer" not in existing_roles:
                    print("Buyer role missing, adding it...")
                    cur.execute(
                        "INSERT INTO roles (name, description) VALUES (%s, %s)",
                        ("buyer", "Can buy and view listings")
                    )
                    print("Buyer role added")
                else:
                    print("Buyer role already exists")
    except Exception as e:
        print(f"Warning: Could not seed default roles: {e}")
        import traceback
        traceback.print_exc()

def apply_schema_if_needed() -> None:
    if not DB_ENABLED:
        return
    conn = get_conn()
    assert conn is not None
    cur = conn.cursor()
    try:
        # Apply schema from schema.sql file
        import pathlib, logging
        schema_path = pathlib.Path(__file__).parents[2] / "db" / "schema.sql"
        if schema_path.exists():
            logging.info("Applying schema from %s", schema_path)
            schema_content = schema_path.read_text(encoding="utf-8")
            # Split by semicolon and execute each statement separately
            statements = [stmt.strip() for stmt in schema_content.split(';') if stmt.strip()]
            for statement in statements:
                if statement:
                    cur.execute(statement)
            logging.info("Schema applied successfully from %s", schema_path)
            
            # Check if we need to add new columns to existing tables
            try:
                # Check if location column exists in listings table
                cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'location'")
                if not cur.fetchone():
                    logging.info("Adding location column to listings table")
                    cur.execute("ALTER TABLE listings ADD COLUMN location text")
                
                # Check if buyer column exists in listings table
                cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'buyer'")
                if not cur.fetchone():
                    logging.info("Adding buyer column to listings table")
                    cur.execute("ALTER TABLE listings ADD COLUMN buyer text")
                    
            except Exception as e:
                logging.warning("Could not check/add new columns: %s", e)
            
            # Seed default roles after schema is applied
            print("Starting role seeding...")
            seed_default_roles(conn)
            print("Role seeding completed")
                
        else:
            logging.error("Schema file not found at %s", schema_path)
            raise FileNotFoundError(f"Schema file not found at {schema_path}")
        logging.info("Schema ensured OK")
    finally:
        cur.close()
        conn.close()
