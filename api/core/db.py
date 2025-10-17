from typing import Optional, Sequence, Any
import logging
import pathlib

from .config import settings
from .connection_pool import db_pool, initialize_pool

try:
    import psycopg  # psycopg3
    from psycopg.rows import dict_row  # optional, if you want dict rows
    _psycopg_available = True
except Exception:
    psycopg = None  # type: ignore
    dict_row = None  # type: ignore
    _psycopg_available = False

logger = logging.getLogger(__name__)

DB_ENABLED: bool = bool(settings.DATABASE_URL and _psycopg_available)


def _ensure_pool_initialized() -> bool:
    if not DB_ENABLED:
        return False
    if not getattr(db_pool, "_initialized", False):
        try:
            initialize_pool()
        except Exception as e:
            logger.error("Failed to initialize DB pool: %s", e, exc_info=True)
            return False
    return True


def get_conn() -> Optional["psycopg.Connection"]:
    """
    BACKWARD COMPAT: Return a *direct* connection (not managed by the pool context).
    Caller is responsible for closing it.

    NOTE: Prefer using: `with db_pool.get_connection() as conn: ...`
    """
    if not DB_ENABLED:
        return None

    # Do NOT acquire via the pool context and return it—would return a closed conn.
    # To preserve old behavior safely, open a direct connection (short-lived use only).
    dsn = settings.DATABASE_URL
    if not dsn:
        return None
    try:
        # Keep it simple and consistent with pool autocommit=True
        conn = psycopg.connect(dsn, autocommit=True)
        return conn
    except Exception as e:
        logger.error("get_conn(): failed to open direct connection: %s", e, exc_info=True)
        return None


def seed_default_roles(conn: "psycopg.Connection") -> None:
    """Seed default roles if they don't exist."""
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM roles")
            roles_count = cur.fetchone()[0]
            logger.info("Current roles count: %s", roles_count)

            # Ensure the three baseline roles exist idempotently
            default_roles = [
                ("admin", "Full access to all features"),
                ("buyer", "Can buy and view listings"),
                ("analyst", "Can view and score listings"),
            ]
            # Use ON CONFLICT if you have a unique constraint on (name); otherwise check existence
            for name, description in default_roles:
                cur.execute(
                    """
                    INSERT INTO roles (name, description)
                    SELECT %s, %s
                    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = %s)
                    """,
                    (name, description, name),
                )
            logger.info("Default roles ensured.")
    except Exception as e:
        logger.warning("Could not seed default roles: %s", e, exc_info=True)


def _read_schema_file() -> Optional[str]:
    # Allow override via settings if you have it
    schema_path = getattr(settings, "SCHEMA_PATH", None)
    if schema_path:
        p = pathlib.Path(schema_path)
    else:
        # repo_root/db/schema.sql (adjust if your layout differs)
        p = pathlib.Path(__file__).parents[2] / "db" / "schema.sql"

    if not p.exists():
        logger.error("Schema file not found at %s", p)
        return None

    try:
        return p.read_text(encoding="utf-8")
    except Exception as e:
        logger.error("Failed reading schema file %s: %s", p, e, exc_info=True)
        return None


def _exec_sql_script(cur: "psycopg.Cursor", script: str) -> None:
    """
    Execute a multi-statement SQL script safely enough for simple schemas.

    NOTE: This still splits on semicolons. If you have functions/procedures with
    embedded semicolons, use a proper migrator (Alembic/Dbmate/etc).
    """
    # Cheap normalization; avoids empty statements on stray semicolons/newlines
    statements = [stmt.strip() for stmt in script.split(";") if stmt.strip()]
    for stmt in statements:
        cur.execute(stmt)


def apply_schema_if_needed() -> None:
    """Create/alter fundamental tables/columns and seed defaults, idempotently."""
    if not DB_ENABLED:
        return
    if not _ensure_pool_initialized():
        return

    schema_content = _read_schema_file()
    if schema_content is None:
        return

    def _table_exists(cur, qualified: str) -> bool:
        # qualified like 'public.users' (defaults to search_path if no schema provided)
        cur.execute("SELECT to_regclass(%s)", (qualified,))
        return cur.fetchone()[0] is not None

    with db_pool.get_connection() as conn:
        if not conn:
            return

        with conn.cursor() as cur:
            try:
                logger.info("Applying schema...")
                _exec_sql_script(cur, schema_content)
                logger.info("Base schema applied.")

                # ----- listings table columns -----
                if _table_exists(cur, "public.listings"):
                    # ADD COLUMN IF NOT EXISTS is valid on PG >= 9.6
                    cur.execute("ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS location text")
                    cur.execute("ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS buyer_id text")

                    # Backfill buyer_id from legacy 'buyer' if present
                    cur.execute("""
                        DO $$
                        BEGIN
                            IF EXISTS (
                                SELECT 1
                                FROM information_schema.columns
                                WHERE table_schema = 'public'
                                  AND table_name = 'listings'
                                  AND column_name = 'buyer'
                            ) THEN
                                UPDATE public.listings
                                   SET buyer_id = buyer
                                 WHERE buyer_id IS NULL;
                            END IF;
                        END $$;
                    """)

                else:
                    logger.warning("Skipping ALTERs for listings: table does not exist yet")

                # ----- users.username column -----
                if _table_exists(cur, "public.users"):
                    cur.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username text")
                else:
                    logger.warning("Skipping ALTER users: table does not exist yet")

                # ----- user_signup_requests.username column -----
                if _table_exists(cur, "public.user_signup_requests"):
                    cur.execute("ALTER TABLE public.user_signup_requests ADD COLUMN IF NOT EXISTS username text")
                else:
                    logger.warning("Skipping ALTER user_signup_requests: table does not exist yet")

                # Seed default roles
                seed_default_roles(conn)

                logger.info("Schema ensured OK.")
            except Exception as e:
                logger.error("Schema application failed: %s", e, exc_info=True)
                # decide whether to re-raise; keeping logged-only to avoid crashing boot
                # raise

