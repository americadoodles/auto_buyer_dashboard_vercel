from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
from .db import DB_ENABLED, apply_schema_if_needed
from .connection_pool import initialize_pool, close_pool

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO)
    if DB_ENABLED:
        try:
            logging.info("Lifespan start: initializing connection pool…")
            initialize_pool()
            logging.info("Lifespan start: ensuring schema…")
            apply_schema_if_needed()
            logging.info("Lifespan: schema ready")
        except Exception:
            logging.exception("Schema bootstrap failed")
    else:
        logging.warning("DB is disabled; running in in-memory mode")
    
    yield
    
    # Cleanup on shutdown
    if DB_ENABLED:
        try:
            logging.info("Lifespan end: closing connection pool…")
            close_pool()
            logging.info("Lifespan: connection pool closed")
        except Exception:
            logging.exception("Error closing connection pool")
