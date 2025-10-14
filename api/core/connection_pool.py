"""
Database connection pool implementation with configurable pool size and automatic recycling.
"""
import logging
import threading
import time
from contextlib import contextmanager
from typing import Optional, Generator, Any
from .config import settings

try:
    import psycopg
    import psycopg_pool
    _psycopg_available = True
except Exception:
    psycopg = None  # type: ignore
    psycopg_pool = None  # type: ignore
    _psycopg_available = False


class DatabaseConnectionPool:
    """
    A database connection pool that manages PostgreSQL connections with configurable
    pool size, automatic connection recycling, and proper resource management.
    """
    
    def __init__(self):
        self._pool: Optional[psycopg_pool.ConnectionPool] = None
        self._lock = threading.Lock()
        self._initialized = False
        self._logger = logging.getLogger(__name__)
        
    def initialize(self) -> None:
        """Initialize the connection pool with settings from config."""
        if not _psycopg_available:
            self._logger.warning("psycopg not available, connection pool disabled")
            return
            
        if not settings.DATABASE_URL:
            self._logger.warning("DATABASE_URL not configured, connection pool disabled")
            return
            
        with self._lock:
            if self._initialized:
                return
                
            try:
                # Prepare connection string with SSL settings
                dsn = settings.DATABASE_URL
                environment = settings.ENVIRONMENT
                
                # Only require sslmode=require for cloud environments
                if environment != "local" and "sslmode=" not in dsn:
                    sep = "&" if "?" in dsn else "?"
                    dsn = f"{dsn}{sep}sslmode=require"
                
                # Create connection pool
                self._pool = psycopg_pool.ConnectionPool(
                    dsn,
                    min_size=settings.DB_POOL_MIN_SIZE,
                    max_size=settings.DB_POOL_MAX_SIZE,
                    kwargs={
                        "autocommit": True,
                        "prepare_threshold": None,  # Disable prepared statements for better compatibility
                    }
                )
                
                self._initialized = True
                self._logger.info(
                    f"Connection pool initialized: min_size={settings.DB_POOL_MIN_SIZE}, "
                    f"max_size={settings.DB_POOL_MAX_SIZE}, "
                    f"recycle_seconds={settings.DB_POOL_RECYCLE_SECONDS}"
                )
                
            except Exception as e:
                self._logger.error(f"Failed to initialize connection pool: {e}")
                raise
    
    def close(self) -> None:
        """Close the connection pool and all connections."""
        with self._lock:
            if self._pool:
                try:
                    self._pool.close()
                    self._logger.info("Connection pool closed")
                except Exception as e:
                    self._logger.error(f"Error closing connection pool: {e}")
                finally:
                    self._pool = None
                    self._initialized = False
    
    @contextmanager
    def get_connection(self) -> Generator[Optional[Any], None, None]:
        """
        Get a connection from the pool with automatic cleanup.
        
        Usage:
            with db_pool.get_connection() as conn:
                if conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                        result = cur.fetchone()
        """
        if not self._initialized or not self._pool:
            self._logger.warning("Connection pool not initialized")
            yield None
            return
            
        conn = None
        try:
            # Get connection from pool with timeout
            conn = self._pool.getconn(timeout=settings.DB_POOL_TIMEOUT_SECONDS)
            if conn:
                # Check if connection is still alive
                try:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                        cur.fetchone()
                except Exception:
                    # Connection is dead, get a new one
                    self._pool.putconn(conn, close=True)
                    conn = self._pool.getconn(timeout=settings.DB_POOL_TIMEOUT_SECONDS)
            
            yield conn
            
        except Exception as e:
            self._logger.error(f"Error getting connection from pool: {e}")
            yield None
            
        finally:
            if conn:
                try:
                    # Return connection to pool
                    self._pool.putconn(conn)
                except Exception as e:
                    self._logger.error(f"Error returning connection to pool: {e}")
    
    def get_pool_stats(self) -> dict:
        """Get current pool statistics."""
        if not self._initialized or not self._pool:
            return {"initialized": False}
            
        try:
            return {
                "initialized": True,
                "min_size": self._pool.min_size,
                "max_size": self._pool.max_size,
                "pool_size": getattr(self._pool, 'size', 'unknown'),
                "pool_info": str(self._pool)
            }
        except Exception as e:
            self._logger.error(f"Error getting pool stats: {e}")
            return {"initialized": True, "error": str(e)}


# Global connection pool instance
db_pool = DatabaseConnectionPool()


def initialize_pool() -> None:
    """Initialize the global connection pool."""
    db_pool.initialize()


def close_pool() -> None:
    """Close the global connection pool."""
    db_pool.close()


def get_connection():
    """Get a connection from the pool (for backward compatibility)."""
    return db_pool.get_connection()
