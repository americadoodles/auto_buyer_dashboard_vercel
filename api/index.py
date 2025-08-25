from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.lifespan import lifespan

from routes.ingest import router as ingest_router
from routes.listings import router as listings_router
from routes.score import router as score_router
from routes.notify import router as notify_router

app = FastAPI(title=settings.APP_TITLE, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest_router)
app.include_router(listings_router)
app.include_router(score_router)
app.include_router(notify_router)

@app.get("/healthz")
def healthz():
    return {"ok": True}
