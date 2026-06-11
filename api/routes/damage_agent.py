# Damage Detection Agent — control & report routes
#
# Mounted under /api/agents/damage/*. The Next.js dev rewrite proxies any
# /api/* path that has no local route handler to this FastAPI backend.

from typing import Any, Dict, List, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg.rows import dict_row
from pydantic import BaseModel

from ..core.auth import get_current_user
from ..core.db_helpers import execute_with_connection
from ..services.damage_agent_runner import AgentControlError, damage_agent

logger = logging.getLogger(__name__)

damage_agent_router = APIRouter(prefix="/agents/damage", tags=["damage-agent"])


class StartRequest(BaseModel):
    restart: bool = False                 # True = reset cursor and rescan all pending listings
    date_from: Optional[str] = None       # YYYY-MM-DD — only listings ingested on/after this date
    date_to: Optional[str] = None         # YYYY-MM-DD — only listings ingested on/before this date


def _control(action: str, fn) -> Dict[str, Any]:
    """Run a control action, mapping domain errors to clean HTTP responses."""
    try:
        return fn()
    except AgentControlError as e:
        # Invalid state transition (e.g. pausing an idle agent) — client error.
        raise HTTPException(status_code=409, detail=str(e))
    except Exception:
        logger.exception("Damage agent %s failed", action)
        raise HTTPException(status_code=500, detail=f"Agent {action} failed")


@damage_agent_router.post("/start")
def start_agent(req: StartRequest = StartRequest(), current_user=Depends(get_current_user)):
    """
    Start the damage detection agent over listings ingested within the given
    date range (optional, inclusive). Only passenger / light commercial
    vehicles are analyzed; other classes are classified and skipped.
    """
    return _control(
        "start",
        lambda: damage_agent.start(
            restart=req.restart, date_from=req.date_from, date_to=req.date_to,
        ),
    )


@damage_agent_router.post("/pause")
def pause_agent(current_user=Depends(get_current_user)):
    """Pause the agent after the in-flight listing finishes."""
    return _control("pause", damage_agent.pause)


@damage_agent_router.post("/resume")
def resume_agent(current_user=Depends(get_current_user)):
    """Resume a paused agent (works across server restarts via the DB cursor)."""
    return _control("resume", damage_agent.resume)


@damage_agent_router.post("/stop")
def stop_agent(current_user=Depends(get_current_user)):
    """Stop the agent. Progress is kept; a later start/resume continues."""
    return _control("stop", damage_agent.stop)


@damage_agent_router.get("/status")
def agent_status(current_user=Depends(get_current_user)):
    """Current agent state: status, progress counters, cursor, last error."""
    try:
        return damage_agent.status()
    except Exception:
        logger.exception("Damage agent status failed")
        raise HTTPException(status_code=500, detail="Failed to read agent status")


@damage_agent_router.get("/reports")
def list_reports(
    listing_id: Optional[int] = Query(default=None, ge=1),
    status: Optional[str] = Query(default=None, pattern="^(pending|processing|completed|failed|skipped)$"),
    since_id: Optional[int] = Query(default=None, ge=0, description="Only reports with id > since_id (for incremental polling)"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_user),
):
    """Damage reports joined with listing context, newest first."""
    where: List[str] = []
    params: List[Any] = []
    if listing_id is not None:
        where.append("dr.listing_id = %s")
        params.append(listing_id)
    if status is not None:
        where.append("dr.status = %s")
        params.append(status)
    if since_id is not None:
        where.append("dr.id > %s")
        params.append(since_id)
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    rows = execute_with_connection(
        f"""
        SELECT dr.id, dr.listing_id, dr.status, dr.report, dr.model,
               dr.images_analyzed, dr.error, dr.created_at, dr.updated_at,
               l.vin, l.year, l.make, l.model AS vehicle_model, l.trim,
               l.price, l.images
        FROM damage_reports dr
        JOIN listings l ON l.id = dr.listing_id
        {where_sql}
        ORDER BY dr.updated_at DESC, dr.id DESC
        LIMIT %s OFFSET %s
        """,
        (*params, limit, offset),
        fetch="all",
        row_factory=dict_row,
    )
    if rows is None:
        raise HTTPException(status_code=503, detail="Database unavailable")

    count_row = execute_with_connection(
        f"SELECT COUNT(*) FROM damage_reports dr {where_sql}",
        tuple(params),
        fetch="one",
    )
    total = int(count_row[0]) if count_row else 0

    reports = []
    for r in rows:
        r = dict(r)
        r["created_at"] = r["created_at"].isoformat() if r.get("created_at") else None
        r["updated_at"] = r["updated_at"].isoformat() if r.get("updated_at") else None
        reports.append(r)

    return {"reports": reports, "total": total, "limit": limit, "offset": offset}
