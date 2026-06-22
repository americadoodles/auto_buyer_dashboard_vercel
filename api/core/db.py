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

# Tables the app cannot function without. Verified after migrations run so a
# silently-failed migration surfaces loudly instead of as a later runtime 503.
CRITICAL_TABLES: tuple[str, ...] = ("users", "listings", "damage_reports", "agent_state")


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
        # api/db/schema.sql (db folder lives inside the api package)
        p = pathlib.Path(__file__).parents[1] / "db" / "schema.sql"

    if not p.exists():
        logger.error("Schema file not found at %s", p)
        return None

    try:
        return p.read_text(encoding="utf-8")
    except Exception as e:
        logger.error("Failed reading schema file %s: %s", p, e, exc_info=True)
        return None


def _read_crm_schema_file() -> Optional[str]:
    """Read the CRM schema file."""
    p = pathlib.Path(__file__).parents[1] / "db" / "crm_schema.sql"

    if not p.exists():
        logger.error("CRM schema file not found at %s", p)
        return None

    try:
        return p.read_text(encoding="utf-8")
    except Exception as e:
        logger.error("Failed reading CRM schema file %s: %s", p, e, exc_info=True)
        return None


def _read_migration_file(filename: str) -> Optional[str]:
    """Read a migration SQL file from the api/db/ directory."""
    p = pathlib.Path(__file__).parents[1] / "db" / filename

    if not p.exists():
        logger.warning("Migration file not found at %s", p)
        return None

    try:
        return p.read_text(encoding="utf-8")
    except Exception as e:
        logger.error("Failed reading migration file %s: %s", p, e, exc_info=True)
        return None


def _exec_sql_script(cur: "psycopg.Cursor", script: str) -> None:
    """
    Execute a multi-statement SQL script safely enough for simple schemas.

    NOTE: This still splits on semicolons. If you have functions/procedures with
    embedded semicolons, use a proper migrator (Alembic/Dbmate/etc).
    """
    # Cheap normalization; avoids empty statements on stray semicolons/newlines
    # statements = [stmt.strip() for stmt in script.split(";") if stmt.strip()]
    # for stmt in statements:
    #     cur.execute(stmt)
    cur.execute(script)


def apply_schema_if_needed() -> None:
    """Create/alter fundamental tables/columns and seed defaults, idempotently."""
    if not DB_ENABLED:
        return
    if not _ensure_pool_initialized():
        return

    schema_content = _read_schema_file()
    if schema_content is None:
        return

    crm_schema_content = _read_crm_schema_file()
    if crm_schema_content is None:
        logger.warning("CRM schema not found, skipping CRM tables")

    def _table_exists(cur, qualified: str) -> bool:
        # qualified like 'public.users' (defaults to search_path if no schema provided)
        cur.execute("SELECT to_regclass(%s)", (qualified,))
        return cur.fetchone()[0] is not None

    with db_pool.get_connection() as conn:
        if not conn:
            return

        with conn.cursor() as cur:
            # Each step below is independently guarded: a failure in any one of
            # them must NEVER prevent the versioned migration files (further down)
            # from running, and a missing critical table must surface LOUDLY at
            # boot rather than as a mysterious 503 the first time a query hits the
            # absent relation. The pool runs in autocommit mode, so a failed
            # statement leaves the connection usable for the steps that follow.
            def _step(label: str, fn) -> None:
                try:
                    fn()
                except Exception as step_err:
                    logger.warning(
                        "Schema step '%s' failed (continuing): %s",
                        label, step_err, exc_info=True,
                    )

            try:
                def _base_schema():
                    logger.info("Applying schema...")
                    _exec_sql_script(cur, schema_content)
                    logger.info("Base schema applied.")
                _step("base schema", _base_schema)

                # Apply CRM schema if available
                if crm_schema_content:
                    def _crm_schema():
                        logger.info("Applying CRM schema...")
                        _exec_sql_script(cur, f"BEGIN;\n{crm_schema_content}\nCOMMIT;")
                        logger.info("CRM schema applied.")
                    _step("CRM schema", _crm_schema)

                # ----- listings table columns -----
                def _listings_cols():
                    if not _table_exists(cur, "public.listings"):
                        logger.warning("Skipping ALTERs for listings: table does not exist yet")
                        return
                    # ADD COLUMN IF NOT EXISTS is valid on PG >= 9.6
                    cur.execute("ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS location text")
                    cur.execute("ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS buyer_id text")
                    cur.execute("ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS images text[]")
                    # listed_at powers dynamic Days-on-Market (DOM = now() - listed_at,
                    # computed at read time). Create it here in the GUARANTEED early
                    # step so the read queries can never hit a missing column even if
                    # the versioned migration (032) hasn't run. The accurate backfill
                    # lives in migration 032, which runs AFTER fb_creation_time exists;
                    # until then reads fall back to created_at via COALESCE.
                    cur.execute("ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listed_at timestamptz")
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_listings_listed_at ON public.listings(listed_at)")
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
                _step("listings columns", _listings_cols)

                # ----- users.username / last_login columns -----
                def _users_cols():
                    if not _table_exists(cur, "public.users"):
                        logger.warning("Skipping ALTER users: table does not exist yet")
                        return
                    cur.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username text")
                    cur.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login timestamptz")
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login)")
                    # Best-effort approximation for existing rows.
                    cur.execute("UPDATE public.users SET last_login = created_at WHERE last_login IS NULL")
                _step("users columns", _users_cols)

                # ----- user_signup_requests.username column -----
                def _signup_cols():
                    if not _table_exists(cur, "public.user_signup_requests"):
                        logger.warning("Skipping ALTER user_signup_requests: table does not exist yet")
                        return
                    cur.execute("ALTER TABLE public.user_signup_requests ADD COLUMN IF NOT EXISTS username text")
                _step("user_signup_requests columns", _signup_cols)

                # ----- ensure created_at on assorted legacy tables -----
                def _ensure_created_at():
                    for tbl in ("vehicles", "roles", "user_signup_requests", "task_activity"):
                        if _table_exists(cur, f"public.{tbl}"):
                            cur.execute(
                                f"ALTER TABLE public.{tbl} "
                                f"ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()"
                            )
                            logger.info("Ensured created_at on %s", tbl)
                        else:
                            logger.warning("Skipping created_at for %s: table does not exist yet", tbl)
                _step("created_at backfill", _ensure_created_at)

                # =============================================
                # Apply all migration files (idempotent, safe)
                # =============================================
                _migration_files = [
                    "001_update_leads_schema.sql",
                    "007_event_outbox_schema.sql",
                    "008_add_lead_id_to_deals.sql",
                    "009_add_mmr_to_listings.sql",
                    "010_add_listing_fields.sql",
                    "011_add_lpn_to_listings.sql",
                    "012_add_lpn_state_to_listings.sql",
                    "013_create_accu_trade_data.sql",
                    "014_create_mmr_data.sql",
                    "015_create_condition_reports.sql",
                    "add_user_activity.sql",
                    "migrate_users_role.sql",
                    "seed_roles.sql",
                    "seed_crm_data.sql",
                    "migrations/add_phone_columns_to_communications.sql",
                    "migrations/016_add_notes_to_listings.sql",
                    "migrations/017_add_vehicle_detail_columns_to_listings.sql",
                    "migrations/018_add_is_hidden_to_deals.sql",
                    "migrations/019_merge_vehicles_into_listings.sql",
                    "migrations/020_drop_lead_and_deal_vehicles.sql",
                    "migrations/021_link_listings_to_contacts.sql",
                    "migrations/022_drop_listing_seller_columns.sql",
                    "migrations/023_add_fb_marketplace_fields.sql",
                    "migrations/024_flatten_fb_marketplace_fields.sql",
                    "migrations/025_add_engine_size_to_listings.sql",
                    "migrations/026_force_drop_vehicles.sql",
                    "migrations/027_repair_listings_id_default.sql",
                    "migrations/028_damage_detection_agent.sql",
                    "migrations/029_damage_agent_run_config.sql",
                    "migrations/030_crm_agents.sql",
                    "migrations/031_fb_scraper_agent.sql",
                    "migrations/032_add_listed_at_to_listings.sql",
                ]
                for mig_file in _migration_files:
                    mig_sql = _read_migration_file(mig_file)
                    if mig_sql:
                        try:
                            logger.info("Applying migration: %s", mig_file)
                            _exec_sql_script(cur, mig_sql)
                            logger.info("Migration applied: %s", mig_file)
                        except Exception as mig_err:
                            logger.warning(
                                "Migration %s failed (may already be applied): %s",
                                mig_file,
                                mig_err,
                                exc_info=True,
                            )

                # Seed default roles
                _step("seed default roles", lambda: seed_default_roles(conn))

                # =============================================
                # Post-condition: the tables the app depends on MUST exist now.
                # If a migration silently failed to apply, fail LOUDLY here instead
                # of letting the app 503 later when a query hits the missing table.
                # =============================================
                missing = [t for t in CRITICAL_TABLES if not _table_exists(cur, f"public.{t}")]
                if missing:
                    msg = (
                        "Schema verification FAILED — critical tables missing after "
                        f"migrations: {', '.join(missing)}. See earlier "
                        "'Migration ... failed' / 'Schema step ... failed' warnings "
                        "for the root cause."
                    )
                    logger.error(msg)
                    # Crash boot in local/dev so it is caught immediately; in deployed
                    # environments stay up (avoid an outage) but emit ERROR to alert on.
                    if getattr(settings, "ENVIRONMENT", "local") == "local":
                        raise RuntimeError(msg)
                else:
                    logger.info("Schema ensured OK (critical tables present).")
            except Exception as e:
                logger.error("Schema application failed: %s", e, exc_info=True)
                # Re-raise in local/dev to surface problems immediately; in deployed
                # environments stay up so a transient issue doesn't take prod down.
                if getattr(settings, "ENVIRONMENT", "local") == "local":
                    raise


def missing_critical_tables() -> list[str]:
    """Return any CRITICAL_TABLES that do not exist on the configured DB.

    Returns the full list when the DB is unreachable (treat as "all missing"),
    so callers can distinguish "all good" (empty list) from any problem.
    """
    if not DB_ENABLED or not _ensure_pool_initialized():
        return list(CRITICAL_TABLES)
    with db_pool.get_connection() as conn:
        if not conn:
            return list(CRITICAL_TABLES)
        with conn.cursor() as cur:
            missing: list[str] = []
            for table in CRITICAL_TABLES:
                cur.execute("SELECT to_regclass(%s)", (f"public.{table}",))
                if cur.fetchone()[0] is None:
                    missing.append(table)
            return missing


def main() -> int:
    """CLI entrypoint: apply schema + all migrations to the configured DB,
    then verify the critical tables exist.

    Run against any environment by exporting that environment's DATABASE_URL:

        export DATABASE_URL='postgresql://user:pass@host:5432/db?sslmode=require'
        python -m api.core.db

    Exit code 0 when every critical table is present, 1 otherwise. Reuses the
    exact same migration list and logic the app runs on cold start — no
    duplicated SQL.
    """
    logging.basicConfig(level=logging.INFO)
    if not DB_ENABLED:
        logger.error("DB not enabled: set DATABASE_URL (and install psycopg).")
        return 1

    initialize_pool()
    apply_schema_if_needed()

    missing = missing_critical_tables()
    if missing:
        logger.error("FAILED — critical tables still missing: %s", ", ".join(missing))
        return 1
    logger.info("OK — all critical tables present: %s", ", ".join(CRITICAL_TABLES))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

