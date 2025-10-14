from typing import Optional
from .config import settings
from .connection_pool import db_pool, initialize_pool, close_pool, get_connection

try:
    import psycopg
    _psycopg_available = True
except Exception:
    psycopg = None  # type: ignore
    _psycopg_available = False

DB_ENABLED: bool = bool(settings.DATABASE_URL and _psycopg_available)

def get_conn() -> Optional["psycopg.Connection"]:
    """
    Get a database connection from the connection pool.
    This function is kept for backward compatibility.
    For new code, use the connection pool context manager directly.
    """
    if not DB_ENABLED:
        return None
    
    # Initialize pool if not already done
    if not db_pool._initialized:
        initialize_pool()
    
    # Return a connection from the pool
    # Note: This is a simplified version for backward compatibility
    # The connection should be properly managed by the caller
    try:
        with db_pool.get_connection() as conn:
            return conn
    except Exception:
        return None

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
    
    # Initialize pool if not already done
    if not db_pool._initialized:
        initialize_pool()
    
    with db_pool.get_connection() as conn:
        if not conn:
            return
            
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
                        # Ensure location column exists
                        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'location'")
                        if not cur.fetchone():
                            logging.info("Adding location column to listings table")
                            cur.execute("ALTER TABLE listings ADD COLUMN location text")

                        # Ensure buyer_id column exists; if not, add and backfill from legacy 'buyer'
                        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'buyer_id'")
                        if not cur.fetchone():
                            logging.info("Adding buyer_id column to listings table")
                            cur.execute("ALTER TABLE listings ADD COLUMN buyer_id text")
                            # Backfill if legacy 'buyer' exists
                            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'listings' AND column_name = 'buyer'")
                            if cur.fetchone():
                                logging.info("Backfilling buyer_id from legacy buyer column")
                                cur.execute("UPDATE listings SET buyer_id = buyer WHERE buyer_id IS NULL")

                        # Ensure username column exists in users
                        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username'")
                        if not cur.fetchone():
                            logging.info("Adding username column to users table")
                            cur.execute("ALTER TABLE users ADD COLUMN username text")
                            # No backfill here; admin can update existing users manually

                        # Ensure username column exists in user_signup_requests
                        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_signup_requests' AND column_name = 'username'")
                        if not cur.fetchone():
                            logging.info("Adding username column to user_signup_requests table")
                            cur.execute("ALTER TABLE user_signup_requests ADD COLUMN username text")

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
