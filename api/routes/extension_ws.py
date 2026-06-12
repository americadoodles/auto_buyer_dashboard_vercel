"""
WebSocket endpoint for the Chrome extension that scrapes FB Marketplace.

URL: /ws/extensions/fb-scraper?token=<jwt>

The dashboard's "FB Scraper Agent" card sends control commands (scrape.start,
scrape.stop, templates.refresh) to a specific user's extension via the
ws_extension_manager singleton. The extension reports back status updates
which flow into fb_scraper_state via the fb_scraper runner's event hooks.

Auth: JWT passed as `?token=...` query parameter (browser WebSocket clients
can't set custom request headers on the upgrade, so query-string is the
practical choice; the URL is over wss in production).
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status as http_status

from ..core.auth import decode_token
from ..repositories.users import get_user_by_email
from ..services.ws_extension_manager import ExtensionConnection, extension_manager

logger = logging.getLogger(__name__)

extension_ws_router = APIRouter()

# How often the server sends `ping`. Two missed pongs (~60s) is considered a
# dead connection — we don't kill it server-side (the client may recover) but
# the runner reports it as `disconnected` in status().
_PING_INTERVAL_SECONDS = 20.0


async def _resolve_user(token: str):
    """Validate JWT and return the user, or None if invalid / not confirmed."""
    try:
        payload = decode_token(token)
    except Exception:
        return None
    email = payload.get("sub")
    if not email:
        return None
    user = get_user_by_email(email)
    if not user or not user.is_confirmed:
        return None
    return user


async def _ping_loop(conn: ExtensionConnection) -> None:
    """Background task that ticks `ping` while the connection is open."""
    try:
        while True:
            await asyncio.sleep(_PING_INTERVAL_SECONDS)
            try:
                await conn.send({"type": "ping", "payload": {"ts": asyncio.get_event_loop().time()}})
            except Exception:
                # Send loop will detect the dead socket; exit quietly.
                return
    except asyncio.CancelledError:
        return


@extension_ws_router.websocket("/ws/extensions/fb-scraper")
async def fb_scraper_extension_ws(
    websocket: WebSocket,
    token: str = Query(..., description="Dashboard JWT (same one REST uses)"),
):
    # Resolve auth BEFORE accepting the upgrade so the extension sees a clean
    # 4401 close instead of a half-open socket.
    user = await _resolve_user(token)
    if user is None:
        await websocket.close(code=http_status.WS_1008_POLICY_VIOLATION, reason="invalid token")
        return

    await websocket.accept()

    # Late import: avoids a circular dependency between this route and the
    # runner module (the runner imports the manager too).
    from ..services.fb_scraper_runner import fb_scraper_agent

    conn = await extension_manager.register(user.id, websocket)
    ping_task = asyncio.create_task(_ping_loop(conn))
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg: Dict[str, Any] = json.loads(raw)
            except Exception:
                logger.debug("Ignoring non-JSON frame from user %s: %s", user.id, raw[:200])
                continue
            mtype = msg.get("type")
            payload = msg.get("payload") or {}
            if not isinstance(mtype, str):
                continue

            if mtype == "register":
                conn.extension_version = payload.get("extension_version")
                conn.fb_logged_in = bool(payload.get("fb_logged_in"))
                names = payload.get("captured_template_names") or []
                if isinstance(names, list):
                    conn.captured_template_names = [str(n) for n in names]
            elif mtype == "pong":
                conn.last_pong_at = asyncio.get_event_loop().time()
            elif mtype == "templates.captured":
                names = payload.get("captured_template_names") or []
                if isinstance(names, list):
                    conn.captured_template_names = [str(n) for n in names]
            elif mtype == "scrape.started":
                fb_scraper_agent.on_started(user.id)
            elif mtype == "scrape.progress":
                fb_scraper_agent.on_progress(
                    user.id,
                    total=payload.get("total"),
                    processed=payload.get("processed"),
                    succeeded=payload.get("succeeded"),
                    failed=payload.get("failed"),
                    skipped=payload.get("skipped"),
                )
            elif mtype == "scrape.listing":
                # The actual listing data is already POSTed to /api/ingest/facebook
                # by the extension. This event is just a counter bump for the UI.
                fb_scraper_agent.on_listing(user.id)
            elif mtype == "scrape.done":
                fb_scraper_agent.on_done(
                    user.id,
                    total=payload.get("total"),
                    processed=payload.get("processed"),
                    succeeded=payload.get("succeeded"),
                    failed=payload.get("failed"),
                    skipped=payload.get("skipped"),
                )
            elif mtype == "scrape.error":
                fb_scraper_agent.on_error(user.id, message=str(payload.get("message") or "")[:1000])
            else:
                logger.debug("Unhandled message type %s from user %s", mtype, user.id)
    except WebSocketDisconnect:
        logger.info("Extension WS closed for user %s", user.id)
    except Exception:
        logger.exception("Extension WS crashed for user %s", user.id)
    finally:
        ping_task.cancel()
        await extension_manager.unregister(user.id, conn)
