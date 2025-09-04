from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.lifespan import lifespan

from .routes.routes import ingest_router, listings_router, score_router, notify_router

from .routes.users import user_router
from .routes.roles import role_router

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

app = FastAPI(title=settings.APP_TITLE, lifespan=lifespan, redirect_slashes=False)

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
app.include_router(role_router, prefix="/api")

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

# Check roles status for debugging
@app.get("/api/_roles_status")
def roles_status():
    from .core.db import get_conn, DB_ENABLED
    if not DB_ENABLED:
        return {"ok": False, "reason": "DB disabled or no URL"}
    
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            # Check if roles table exists and has data
            cur.execute("SELECT COUNT(*) FROM roles")
            roles_count = cur.fetchone()[0]
            
            # Get all roles
            cur.execute("SELECT id, name, description FROM roles ORDER BY id")
            roles = [{"id": row[0], "name": row[1], "description": row[2]} for row in cur.fetchall()]
            
            # Check if buyer role exists specifically
            cur.execute("SELECT id FROM roles WHERE name = 'buyer'")
            buyer_role = cur.fetchone()
            
            return {
                "ok": True,
                "roles_count": roles_count,
                "roles": roles,
                "buyer_role_exists": buyer_role is not None,
                "buyer_role_id": buyer_role[0] if buyer_role else None
            }
    except Exception as e:
        return {"ok": False, "error": str(e)}
    finally:
        if 'conn' in locals():
            conn.close()