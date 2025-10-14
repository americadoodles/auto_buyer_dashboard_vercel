"""
Database helper functions for using the connection pool with backward compatibility.
"""
from typing import Optional, Generator, Any, Callable
from contextlib import contextmanager
import logging
from .connection_pool import db_pool
from .db import DB_ENABLED

logger = logging.getLogger(__name__)


@contextmanager
def get_db_connection() -> Generator[Optional[Any], None, None]:
    """
    Get a database connection from the pool with automatic cleanup.
    This is the recommended way to get database connections.
    
    Usage:
        with get_db_connection() as conn:
            if conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
                    result = cur.fetchone()
    """
    if not DB_ENABLED:
        yield None
        return
        
    with db_pool.get_connection() as conn:
        yield conn


def with_db_connection(func: Callable) -> Callable:
    """
    Decorator to automatically provide a database connection to a function.
    
    The decorated function should accept a 'conn' parameter as the first argument
    after any non-db parameters.
    """
    def wrapper(*args, **kwargs):
        with get_db_connection() as conn:
            if not conn:
                logger.warning("Database connection not available")
                return None
            return func(conn, *args, **kwargs)
    return wrapper


def execute_with_connection(query: str, params: tuple = None, fetch_one: bool = False, fetch_all: bool = False):
    """
    Execute a query with automatic connection management.
    
    Args:
        query: SQL query to execute
        params: Query parameters
        fetch_one: If True, return the first row
        fetch_all: If True, return all rows
        
    Returns:
        Query result or None if no connection
    """
    with get_db_connection() as conn:
        if not conn:
            return None
            
        try:
            with conn.cursor() as cur:
                cur.execute(query, params)
                
                if fetch_one:
                    return cur.fetchone()
                elif fetch_all:
                    return cur.fetchall()
                else:
                    return None
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            return None
