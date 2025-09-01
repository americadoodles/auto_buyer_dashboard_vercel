from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.lifespan import lifespan

from .routes.routes import ingest_router, listings_router, score_router, notify_router

from .routes.users import user_router

# ---- run-on-cold-start: ensure schema once ----
import logging
from .core.db import DB_ENABLED, apply_schema_if_needed

if DB_ENABLED:
    try:
        logging.basicConfig(level=logging.INFO)
        logging.info("Cold start: ensuring DB schema…")
        apply_schema_if_needed()
        logging.info("Schema ready.")
    except Exception:
        logging.exception("Schema bootstrap failed at import")

# -----------------------------------------------

app = FastAPI(title=settings.APP_TITLE, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router,  prefix="/api")
app.include_router(listings_router,  prefix="/api")
app.include_router(score_router,  prefix="/api")
app.include_router(notify_router,  prefix="/api")
app.include_router(user_router, prefix="/api")

@app.get("/api/healthz")
def healthz():
    return {"ok": True}

# in an admin-only or temp route:
@app.get("/api/db-check")
def db_check():
    from .core.db import get_conn, DB_ENABLED
    if not DB_ENABLED:
        return {"ok": False, "reason": "DB disabled or no URL"}
    conn = get_conn()
    with conn, conn.cursor() as cur:
        cur.execute("select 1")
        return {"ok": True, "one": cur.fetchone()[0]}

# temporary route to confirm the tables/view exist
@app.get("/api/_schema_status")
def schema_status():
    from .core.db import get_conn
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("""
          select
            to_regclass('public.vehicles') as vehicles,
            to_regclass('public.listings') as listings,
            to_regclass('public.scores') as scores,
            to_regclass('public.v_latest_scores') as v_latest_scores
        """)
        v = cur.fetchone()
    conn.close()
    return dict(zip(["vehicles","listings","scores","v_latest_scores"], v))