from contextlib import asynccontextmanager
from fastapi import FastAPI
from api.core.db import apply_schema_if_needed

@asynccontextmanager
async def lifespan(app: FastAPI):
    apply_schema_if_needed()
    yield
