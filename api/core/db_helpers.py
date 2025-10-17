"""
Database helper functions for using the connection pool with backward compatibility.
"""
from typing import Optional, Generator, Any, Callable, Literal, Sequence
from contextlib import contextmanager
from functools import wraps
import logging
import time

from .connection_pool import db_pool
from .db import DB_ENABLED

logger = logging.getLogger(__name__)

FetchMode = Literal["none", "one", "all"]


@contextmanager
def get_db_connection() -> Generator[Optional[Any], None, None]:
    """
    Get a database connection from the pool with automatic cleanup.
    """
    if not DB_ENABLED:
        yield None
        return

    # db_pool.get_connection() is already a contextmanager
    with db_pool.get_connection() as conn:
        yield conn


def with_db_connection(func: Callable) -> Callable:
    """
    Decorator that injects a pooled DB connection into the wrapped function as kwarg `conn=...`.
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        with get_db_connection() as conn:
            if not conn:
                logger.warning("Database connection not available")
                return None
            # Prefer kw injection so function signature is flexible
            kwargs.setdefault("conn", conn)
            return func(*args, **kwargs)

    return wrapper


def execute_with_connection(
    query: str,
    params: Optional[Sequence[Any]] = None,
    *,
    fetch: FetchMode = "none",
    statement_timeout_ms: Optional[int] = None,
    retries: int = 0,
    retry_backoff_ms: int = 50,
    row_factory: Optional[Any] = None,  # e.g. psycopg.rows.dict_row for psycopg3
) -> Optional[Any]:
    """
    Execute a SQL query with automatic connection management.

    Args:
        query: SQL query to execute.
        params: Query parameters (tuple/list).
        fetch: "none" | "one" | "all".
        statement_timeout_ms: Optional per-statement timeout (Postgres-level).
        retries: Number of retries for transient errors (e.g., deadlocks, serialization).
        retry_backoff_ms: Initial backoff between retries in ms.
        row_factory: Optional cursor row factory (psycopg3), e.g., dict_row.

    Returns:
        None | single row | list of rows depending on `fetch`.
    """
    if params is None:
        params = ()

    attempt = 0
    while True:
        with get_db_connection() as conn:
            if not conn:
                return None
            try:
                # psycopg3: row_factory supported on cursor(...)
                # psycopg2: this kw is ignored if unsupported, which is OK
                cursor_kwargs = {}
                if row_factory is not None:
                    cursor_kwargs["row_factory"] = row_factory

                with conn.cursor(**cursor_kwargs) as cur:
                    if statement_timeout_ms is not None:
                        # Scope timeout to this transaction/statement only
                        cur.execute("SET LOCAL statement_timeout = %s", (statement_timeout_ms,))

                    cur.execute(query, params)

                    if fetch == "one":
                        return cur.fetchone()
                    elif fetch == "all":
                        return cur.fetchall()
                    else:
                        return None

            except Exception as e:
                # Retry only on common transient SQLSTATEs
                sqlstate = getattr(e, "sqlstate", None) or getattr(e, "pgcode", None)
                transient_states = {"40001", "40P01"}  # serialization_failure, deadlock_detected
                is_transient = sqlstate in transient_states

                attempt += 1
                if is_transient and attempt <= max(0, retries):
                    delay = (retry_backoff_ms / 1000.0) * (2 ** (attempt - 1))
                    logger.warning(
                        "Transient DB error (sqlstate=%s). Retrying attempt %d/%d in %.0fms. Query=%s",
                        sqlstate, attempt, retries, delay * 1000, _safe_sql_preview(query)
                    )
                    time.sleep(delay)
                    continue

                logger.error(
                    "Database query failed%s: %s | sqlstate=%s | Query=%s",
                    " after retries" if attempt > 1 else "",
                    e, sqlstate, _safe_sql_preview(query),
                    exc_info=True,
                )
                return None


def _safe_sql_preview(sql: str, max_len: int = 500) -> str:
    """Return a truncated SQL preview for logs without parameters."""
    s = " ".join(sql.split())  # collapse whitespace
    return s[:max_len] + ("…" if len(s) > max_len else "")
