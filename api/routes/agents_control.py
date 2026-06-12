# AI Agents — generic control & report routes
#
# One set of endpoints serves every registered agent (damage-detection,
# lead-scoring, deal-risk, followup-drafter, task-generator):
#
#   GET  /api/agents/registry              list agents + current status
#   POST /api/agents/{agent_id}/start      body: {restart?, date_from?, date_to?}
#   POST /api/agents/{agent_id}/pause
#   POST /api/agents/{agent_id}/resume
#   POST /api/agents/{agent_id}/stop
#   GET  /api/agents/{agent_id}/status
#   GET  /api/agents/{agent_id}/reports    ?status=&since_id=&limit=&offset=
#
# The Next.js dev rewrite proxies any /api/* path without a local route
# handler to this FastAPI backend. (Next owns the exact paths /api/agents
# and /api/agents/events — these parameterized paths fall through.)

from typing import Any, Dict, Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..core.auth import get_current_user
from ..services.agents_registry import AGENTS, get_agent
from ..services.crm_agent_runner import AgentControlError as CrmAgentControlError
from ..services.damage_agent_runner import AgentControlError as DamageAgentControlError

logger = logging.getLogger(__name__)

agents_control_router = APIRouter(prefix="/agents", tags=["ai-agents"])

_CONTROL_ERRORS = (CrmAgentControlError, DamageAgentControlError)


class StartRequest(BaseModel):
    restart: bool = False           # rescan from scratch (CRM agents also clear their reports)
    date_from: Optional[str] = None  # YYYY-MM-DD — entity created on/after
    date_to: Optional[str] = None    # YYYY-MM-DD — entity created on/before


def _runner_or_404(agent_id: str):
    runner = get_agent(agent_id)
    if runner is None:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_id}")
    return runner


def _control(agent_id: str, action: str, fn) -> Dict[str, Any]:
    """Run a control action, mapping domain errors to clean HTTP responses."""
    try:
        return fn()
    except _CONTROL_ERRORS as e:
        # Invalid state transition or bad parameters — client error.
        raise HTTPException(status_code=409, detail=str(e))
    except Exception:
        logger.exception("Agent %s %s failed", agent_id, action)
        raise HTTPException(status_code=500, detail=f"Agent {action} failed")


@agents_control_router.get("/registry")
def list_agents(current_user=Depends(get_current_user)):
    """All registered agents with their current control status."""
    out = []
    for agent_id, runner in AGENTS.items():
        try:
            out.append(runner.status())
        except Exception:
            logger.exception("Status read failed for agent %s", agent_id)
            out.append({"agent_id": agent_id, "status": "error",
                        "last_error": "status read failed"})
    return {"agents": out}


@agents_control_router.post("/{agent_id}/start")
def start_agent(agent_id: str, req: StartRequest = StartRequest(),
                current_user=Depends(get_current_user)):
    runner = _runner_or_404(agent_id)
    return _control(agent_id, "start", lambda: runner.start(
        restart=req.restart, date_from=req.date_from, date_to=req.date_to,
    ))


@agents_control_router.post("/{agent_id}/pause")
def pause_agent(agent_id: str, current_user=Depends(get_current_user)):
    runner = _runner_or_404(agent_id)
    return _control(agent_id, "pause", runner.pause)


@agents_control_router.post("/{agent_id}/resume")
def resume_agent(agent_id: str, current_user=Depends(get_current_user)):
    runner = _runner_or_404(agent_id)
    return _control(agent_id, "resume", runner.resume)


@agents_control_router.post("/{agent_id}/stop")
def stop_agent(agent_id: str, current_user=Depends(get_current_user)):
    runner = _runner_or_404(agent_id)
    return _control(agent_id, "stop", runner.stop)


@agents_control_router.get("/{agent_id}/status")
def agent_status(agent_id: str, current_user=Depends(get_current_user)):
    runner = _runner_or_404(agent_id)
    try:
        return runner.status()
    except Exception:
        logger.exception("Status read failed for agent %s", agent_id)
        raise HTTPException(status_code=500, detail="Failed to read agent status")


@agents_control_router.get("/{agent_id}/reports")
def agent_reports(
    agent_id: str,
    status: Optional[str] = Query(default=None, pattern="^(pending|processing|completed|failed|skipped)$"),
    since_id: Optional[int] = Query(default=None, ge=0, description="Only reports with id > since_id (incremental polling)"),
    entity_id: Optional[str] = Query(default=None, max_length=64, description="Filter to one entity (listing id / lead uuid / ...)"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user=Depends(get_current_user),
):
    """Agent reports in the generic shape, newest first."""
    runner = _runner_or_404(agent_id)
    try:
        page = runner.reports(status=status, since_id=since_id, entity_id=entity_id,
                              limit=limit, offset=offset)
    except Exception:
        logger.exception("Reports read failed for agent %s", agent_id)
        raise HTTPException(status_code=500, detail="Failed to read agent reports")
    if page is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    return page
