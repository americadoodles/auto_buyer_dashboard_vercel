import logging
import threading
import time
from contextlib import contextmanager
from typing import Optional, Generator, Any
from .config import settings

try:
    import psycopg
    from psycopg_pool import ConnectionPool
    _psycopg_available = True
except Exception:
    psycopg = None  # type: ignore
    ConnectionPool = None  # type: ignore
    _psycopg_available = False


class DatabaseConnectionPool:
    """
    PostgreSQL connection pool (psycopg3) with configurable sizing and optional recycling.
    """
    def __init__(self) -> None:
        self._pool: Optional[ConnectionPool] = None
        self._lock = threading.Lock()
        self._initialized = False
        self._logger = logging.getLogger(__name__)

        # Internal metrics / policy
        self._recycle_seconds = getattr(settings, "DB_POOL_RECYCLE_SECONDS", 0) or 0
        self._healthcheck_enabled = getattr(settings, "DB_POOL_HEALTHCHECK", False) or False

    def _build_dsn(self) -> Optional[str]:
        if not settings.DATABASE_URL:
            return None
        dsn = settings.DATABASE_URL
        environment = getattr(settings, "ENVIRONMENT", "local")

        # Require SSL in non-local envs if not already present
        if environment != "local" and "sslmode=" not in dsn:
            sep = "&" if "?" in dsn else "?"
            dsn = f"{dsn}{sep}sslmode=require"

        # Optional: ensure write-capable target
        if "target_session_attrs=" not in dsn:
            sep = "&" if "?" in dsn else "?"
            dsn = f"{dsn}{sep}target_session_attrs=read-write"

        return dsn

    def initialize(self) -> None:
        """Initialize the connection pool."""
        if not _psycopg_available:
            self._logger.warning("psycopg not available, connection pool disabled")
            return

        dsn = self._build_dsn()
        if not dsn:
            self._logger.warning("DATABASE_URL not configured, connection pool disabled")
            return

        with self._lock:
            if self._initialized:
                return

            try:
                # NOTE: psycopg3 pool takes connection kwargs via 'kwargs'
                self._pool = ConnectionPool(
                    dsn,
                    min_size=settings.DB_POOL_MIN_SIZE,
                    max_size=settings.DB_POOL_MAX_SIZE,
                    # If your psycopg_pool version supports lifecycle params, set them here, e.g.:
                    # max_lifetime=self._recycle_seconds or None,
                    # max_idle=...,
                    timeout=getattr(settings, "DB_POOL_TIMEOUT_SECONDS", 10),
                    kwargs={
                        "autocommit": True,
                        # avoid legacy psycopg2 params like prepare_threshold
                    },
                    # open=True  # optionally pre-open to avoid first-use latency
                )
                self._initialized = True
                self._logger.info(
                    "Connection pool initialized: min=%s max=%s recycle=%s healthcheck=%s",
                    settings.DB_POOL_MIN_SIZE, settings.DB_POOL_MAX_SIZE,
                    self._recycle_seconds, self._healthcheck_enabled
                )
            except Exception as e:
                self._logger.error("Failed to initialize connection pool: %s", e)
                raise

    def close(self) -> None:
        """Close the connection pool and all connections."""
        with self._lock:
            if self._pool:
                try:
                    self._pool.close()
                    self._logger.info("Connection pool closed")
                except Exception as e:
                    self._logger.error("Error closing connection pool: %s", e)
                finally:
                    self._pool = None
                    self._initialized = False

    def _ensure_initialized(self) -> bool:
        if self._initialized and self._pool:
            return True
        # Lazy init attempt
        try:
            self.initialize()
        except Exception:
            pass
        return self._initialized and self._pool is not None

    @contextmanager
    def get_connection(self) -> Generator[Optional[Any], None, None]:
        """
        Acquire a pooled connection (context-managed).
        """
        if not self._ensure_initialized():
            self._logger.warning("Connection pool not initialized")
            yield None
            return

        assert self._pool is not None

        start = time.time()
        try:
            # Acquire via psycopg3-native context manager (auto-return to pool)
            with self._pool.connection(
                timeout=getattr(settings, "DB_POOL_TIMEOUT_SECONDS", 10)
            ) as conn:

                # Optional conditional health check
                if self._healthcheck_enabled:
                    # Only check if connection is older than recycle window, to avoid constant pings
                    born_at = getattr(conn, "_born_at", None)
                    now = time.time()
                    if born_at is None:
                        try:
                            setattr(conn, "_born_at", now)
                        except Exception:
                            pass  # non-fatal
                    elif self._recycle_seconds and now - born_at > self._recycle_seconds:
                        try:
                            with conn.cursor() as cur:
                                cur.execute("SELECT 1")
                                cur.fetchone()
                            setattr(conn, "_born_at", now)
                        except Exception:
                            # Force close: pool will replace it on next acquisition
                            try:
                                conn.close()
                            except Exception:
                                pass
                            # Re-acquire a fresh connection
                            with self._pool.connection(
                                timeout=getattr(settings, "DB_POOL_TIMEOUT_SECONDS", 10)
                            ) as fresh:
                                yield fresh
                                return

                yield conn

        except Exception as e:
            self._logger.error("Error getting connection from pool: %s", e)
            yield None
        finally:
            waited_ms = int((time.time() - start) * 1000)
            # You could log long waits to detect contention:
            if waited_ms > 500:
                self._logger.debug("Pool checkout + work took %dms", waited_ms)

    def get_pool_stats(self) -> dict:
        """Return minimal stats; extend based on psycopg_pool version features."""
        if not (self._initialized and self._pool):
            return {"initialized": False}
        try:
            return {
                "initialized": True,
                "min_size": getattr(self._pool, "min_size", None),
                "max_size": getattr(self._pool, "max_size", None),
                "info": str(self._pool),
            }
        except Exception as e:
            self._logger.error("Error getting pool stats: %s", e)
            return {"initialized": True, "error": str(e)}


# Global instance and helpers
db_pool = DatabaseConnectionPool()

def initialize_pool() -> None:
    db_pool.initialize()

def close_pool() -> None:
    db_pool.close()

def get_connection():
    return db_pool.get_connection()
