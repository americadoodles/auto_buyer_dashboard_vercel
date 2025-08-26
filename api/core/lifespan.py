from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
from .db import apply_schema_if_needed

@asynccontextmanager
async def lifespan(app: FastAPI):
    if DB_ENABLED:
        try:
            apply_schema_if_needed()   # idempotent CREATE IF NOT EXISTS
        except Exception:
            logging.exception("Schema bootstrap failed")
            # don't raise — keep the function alive so /healthz works
    yield
