"""
Dedicated per-user routes for the FB Marketplace Scraper Agent.

Mounted *before* the generic agents_control_router in api/index.py so that the
specific paths (/api/agents/fb-scraper/start, /stop, ...) win path matching
over the generic /api/agents/{agent_id}/start handlers.

The FB scraper is per-user (each buyer drives their own browser extension),
which doesn't fit the global-singleton contract the generic routes assume.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.auth import get_current_user
from ..schemas.user import UserOut
from ..services.fb_scraper_runner import AgentControlError, fb_scraper_agent

logger = logging.getLogger(__name__)

fb_scraper_router = APIRouter(prefix="/agents/fb-scraper", tags=["ai-agents"])


class FbScraperStartRequest(BaseModel):
    filters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Scraper filters mirroring the extension popup form "
                    "(location, minPrice, maxPrice, minYear, maxYear, "
                    "minMileage, maxMileage, radius, startTime, endTime, "
                    "maxListings, exact).",
    )


def _map_control_error(e: AgentControlError):
    raise HTTPException(status_code=409, detail=str(e))


@fb_scraper_router.post("/start")
async def fb_scraper_start(
    req: FbScraperStartRequest = FbScraperStartRequest(),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        return await fb_scraper_agent.start(current_user.id, req.filters or {})
    except AgentControlError as e:
        _map_control_error(e)
    except Exception:
        logger.exception("fb-scraper start failed for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="fb-scraper start failed")


@fb_scraper_router.post("/stop")
async def fb_scraper_stop(current_user: UserOut = Depends(get_current_user)):
    try:
        return await fb_scraper_agent.stop(current_user.id)
    except AgentControlError as e:
        _map_control_error(e)
    except Exception:
        logger.exception("fb-scraper stop failed for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="fb-scraper stop failed")


@fb_scraper_router.post("/refresh_templates")
async def fb_scraper_refresh_templates(current_user: UserOut = Depends(get_current_user)):
    try:
        return await fb_scraper_agent.refresh_templates(current_user.id)
    except AgentControlError as e:
        _map_control_error(e)
    except Exception:
        logger.exception("fb-scraper refresh_templates failed for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="fb-scraper refresh_templates failed")


@fb_scraper_router.get("/status")
def fb_scraper_status(current_user: UserOut = Depends(get_current_user)):
    return fb_scraper_agent.status(current_user.id)


@fb_scraper_router.get("/reports")
def fb_scraper_reports(
    sinceId: Optional[int] = None,
    status: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: UserOut = Depends(get_current_user),
):
    """The actual scraped listings are persisted by the existing
    /api/ingest/facebook flow and visible in /listings. This endpoint just
    returns an empty page so the generic agent panel renders cleanly."""
    return {"reports": [], "total": 0, "limit": limit, "offset": offset}
