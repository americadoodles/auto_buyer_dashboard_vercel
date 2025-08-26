from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
from .db import DB_ENABLED, apply_schema_if_needed

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(level=logging.INFO)
    if DB_ENABLED:
        try:
            logging.info("Lifespan start: ensuring schema…")
            apply_schema_if_needed()
            logging.info("Lifespan: schema ready")
        except Exception:
            logging.exception("Schema bootstrap failed")
    else:
        logging.warning("DB is disabled; running in in-memory mode")
    yield
