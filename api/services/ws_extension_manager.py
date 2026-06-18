"""
In-memory registry of connected Chrome extensions, keyed by user_id.

Each user can have at most one active extension connection. A new connection
from the same user evicts the older one (last-write-wins). The fb_scraper
runner calls into this manager to push commands (scrape.start / scrape.stop /
templates.refresh) to a specific user's extension, and the WebSocket route
calls it to register / unregister connections.

This lives in process memory — for single-instance deployments only. A
multi-instance deployment would need pub/sub (Redis) to route messages to the
right replica.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ExtensionConnection:
    """One live WebSocket to a user's Chrome extension."""

    def __init__(self, user_id: UUID, websocket: WebSocket) -> None:
        self.user_id = user_id
        self.ws = websocket
        self.connected_at: float = time.time()
        self.last_pong_at: float = self.connected_at
        # Populated by the extension's `register` frame
        self.extension_version: Optional[str] = None
        self.fb_logged_in: Optional[bool] = None
        self.captured_template_names: list[str] = []
        # Lock so one runner.start() doesn't race with another send
        self._send_lock = asyncio.Lock()

    async def send(self, message: Dict[str, Any]) -> None:
        async with self._send_lock:
            await self.ws.send_text(json.dumps(message))

    def info(self) -> Dict[str, Any]:
        """Snapshot for the runner's status() response."""
        return {
            "connected": True,
            "connected_at": self.connected_at,
            "last_pong_at": self.last_pong_at,
            "extension_version": self.extension_version,
            "fb_logged_in": self.fb_logged_in,
            "captured_template_names": self.captured_template_names,
        }


class ExtensionManager:
    """One-extension-per-user registry. Thread-safe via an asyncio lock."""

    def __init__(self) -> None:
        self._conns: Dict[UUID, ExtensionConnection] = {}
        self._lock = asyncio.Lock()

    async def register(self, user_id: UUID, websocket: WebSocket) -> ExtensionConnection:
        """Register a new extension connection, evicting any prior one."""
        async with self._lock:
            old = self._conns.get(user_id)
            conn = ExtensionConnection(user_id, websocket)
            self._conns[user_id] = conn
        if old is not None:
            # Best-effort goodbye before eviction; ignore failures.
            try:
                await old.send({"type": "bye", "payload": {"reason": "replaced"}})
                await old.ws.close(code=1000, reason="replaced")
            except Exception:
                logger.debug("Failed to close evicted extension for user %s", user_id, exc_info=True)
        logger.info("Extension connected for user %s", user_id)
        return conn

    async def unregister(self, user_id: UUID, conn: ExtensionConnection) -> None:
        """Remove only if `conn` is still the active one for this user."""
        async with self._lock:
            current = self._conns.get(user_id)
            if current is conn:
                self._conns.pop(user_id, None)
                logger.info("Extension disconnected for user %s", user_id)

    def get(self, user_id: UUID) -> Optional[ExtensionConnection]:
        return self._conns.get(user_id)

    async def send(self, user_id: UUID, message: Dict[str, Any]) -> bool:
        """Send a message to the user's extension. Returns False if not connected."""
        conn = self._conns.get(user_id)
        if conn is None:
            return False
        try:
            await conn.send(message)
            return True
        except Exception:
            logger.warning("Failed to send to extension for user %s", user_id, exc_info=True)
            return False


# Module-level singleton
extension_manager = ExtensionManager()
