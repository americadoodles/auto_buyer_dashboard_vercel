"""
Dedicated per-user routes for the FB Messenger Agent.

Mounted *before* the generic agents_control_router in api/index.py so that the
specific paths (/api/agents/fb-messenger/start, /stop, ...) win path matching
over the generic /api/agents/{agent_id}/start handlers.

The FB Messenger agent is per-user (each buyer drives their own browser
extension), which doesn't fit the global-singleton contract the generic
routes assume — same reasoning as the FB Scraper agent (fb_scraper.py).
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.auth import get_current_user
from ..schemas.user import UserOut
from ..services.fb_messenger_runner import AgentControlError, fb_messenger_agent

logger = logging.getLogger(__name__)

fb_messenger_router = APIRouter(prefix="/agents/fb-messenger", tags=["ai-agents"])


class SendMessageRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class SetAiModeRequest(BaseModel):
    ai_mode: str = Field(pattern="^(auto|paused)$")


def _map_control_error(e: AgentControlError):
    raise HTTPException(status_code=409, detail=str(e))


@fb_messenger_router.post("/start")
async def fb_messenger_start(current_user: UserOut = Depends(get_current_user)):
    try:
        return await fb_messenger_agent.start(current_user.id)
    except AgentControlError as e:
        _map_control_error(e)
    except Exception:
        logger.exception("fb-messenger start failed for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="fb-messenger start failed")


@fb_messenger_router.post("/stop")
async def fb_messenger_stop(current_user: UserOut = Depends(get_current_user)):
    try:
        return await fb_messenger_agent.stop(current_user.id)
    except AgentControlError as e:
        _map_control_error(e)
    except Exception:
        logger.exception("fb-messenger stop failed for user %s", current_user.id)
        raise HTTPException(status_code=500, detail="fb-messenger stop failed")


@fb_messenger_router.get("/status")
def fb_messenger_status(current_user: UserOut = Depends(get_current_user)):
    return fb_messenger_agent.status(current_user.id)


@fb_messenger_router.get("/threads")
def fb_messenger_threads(
    limit: int = 50,
    offset: int = 0,
    current_user: UserOut = Depends(get_current_user),
):
    return fb_messenger_agent.list_threads(current_user.id, limit=limit, offset=offset)


@fb_messenger_router.get("/threads/{thread_id}/messages")
def fb_messenger_thread_messages(
    thread_id: str,
    limit: int = 100,
    offset: int = 0,
    current_user: UserOut = Depends(get_current_user),
):
    try:
        return fb_messenger_agent.list_messages(current_user.id, thread_id, limit=limit, offset=offset)
    except AgentControlError as e:
        raise HTTPException(status_code=404, detail=str(e))


@fb_messenger_router.post("/threads/{thread_id}/messages")
async def fb_messenger_send_message(
    thread_id: str,
    req: SendMessageRequest,
    current_user: UserOut = Depends(get_current_user),
):
    try:
        return await fb_messenger_agent.send_message(current_user.id, thread_id, req.body)
    except AgentControlError as e:
        _map_control_error(e)
    except Exception:
        logger.exception("fb-messenger send failed for user %s thread %s", current_user.id, thread_id)
        raise HTTPException(status_code=500, detail="fb-messenger send failed")


@fb_messenger_router.post("/listings/{listing_id}/open")
async def fb_messenger_open_listing(
    listing_id: int,
    current_user: UserOut = Depends(get_current_user),
):
    """Open (or create) the conversation for a vehicle listing and ask the
    extension to scrape its chat history. Returns the thread; scraped messages
    arrive asynchronously via the messenger.history WS event."""
    try:
        return await fb_messenger_agent.open_listing_thread(current_user.id, listing_id)
    except AgentControlError as e:
        _map_control_error(e)
    except Exception:
        logger.exception("fb-messenger open failed for user %s listing %s", current_user.id, listing_id)
        raise HTTPException(status_code=500, detail="fb-messenger open failed")


@fb_messenger_router.post("/listings/{listing_id}/messages")
async def fb_messenger_send_listing_message(
    listing_id: int,
    req: SendMessageRequest,
    current_user: UserOut = Depends(get_current_user),
):
    """Send a message to a listing's seller (keyed by FB listing id)."""
    try:
        return await fb_messenger_agent.send_listing_message(current_user.id, listing_id, req.body)
    except AgentControlError as e:
        _map_control_error(e)
    except Exception:
        logger.exception("fb-messenger send-to-listing failed for user %s listing %s", current_user.id, listing_id)
        raise HTTPException(status_code=500, detail="fb-messenger send failed")


@fb_messenger_router.post("/threads/{thread_id}/ai_mode")
async def fb_messenger_set_ai_mode(
    thread_id: str,
    req: SetAiModeRequest,
    current_user: UserOut = Depends(get_current_user),
):
    try:
        return await fb_messenger_agent.set_ai_mode(current_user.id, thread_id, req.ai_mode)
    except AgentControlError as e:
        _map_control_error(e)
    except Exception:
        logger.exception("fb-messenger set_ai_mode failed for user %s thread %s", current_user.id, thread_id)
        raise HTTPException(status_code=500, detail="fb-messenger set_ai_mode failed")
