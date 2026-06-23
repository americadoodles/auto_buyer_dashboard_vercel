"""
FB Messenger Agent — per-user remote control of a Chrome extension.

Same shape as the FB Marketplace Scraper agent (fb_scraper_runner.py): the
actual reading/sending of Facebook Messenger messages happens in the user's
browser via the connected Chrome extension, over the *same* WebSocket
connection (/ws/extensions/fb-scraper, registered in ws_extension_manager).
This module just adds new message types (messenger.*) to that one
extension-per-user connection — it does not open a second WebSocket.

This module:
  * pushes control commands to the connected extension (`messenger.start`,
    `messenger.stop`, `messenger.send`)
  * persists threads/messages reported by the extension into
    messenger_threads / messenger_messages so the dashboard panel can render
    seller conversations
  * resolves pending sends (`messenger.send` -> `messenger.send.result`)

There is no background worker thread — the watch loop runs in the extension.
The runner is just a thin DB+WS bridge, identical in spirit to fb_scraper_runner.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from psycopg.rows import dict_row

from ..core.db_helpers import execute_with_connection
from .ws_extension_manager import extension_manager

logger = logging.getLogger(__name__)

AGENT_ID = "fb-messenger"

AI_MODE_VALUES = ("auto", "paused")


class AgentControlError(Exception):
    """Raised when a control action is invalid for the agent's current state."""


def _require_connection(user_id: UUID):
    conn = extension_manager.get(user_id)
    if conn is None:
        raise AgentControlError(
            "No extension connected. Open the FB Marketplace Inspector "
            "extension and sign in to the dashboard from its popup."
        )
    return conn


class FbMessengerRunner:
    """Per-user remote control of a Chrome extension's Messenger watcher."""

    agent_id = AGENT_ID

    def __init__(self) -> None:
        # request_id -> (user_id, thread_id) for outbound sends awaiting
        # messenger.send.result from the extension.
        self._pending_sends: Dict[str, Dict[str, Any]] = {}

    # ------------------------------------------------------------------ #
    # Public control API (called from the FastAPI routes)
    # ------------------------------------------------------------------ #

    async def start(self, user_id: UUID) -> Dict[str, Any]:
        conn = _require_connection(user_id)
        await conn.send({"type": "messenger.start", "payload": {}})
        logger.info("[%s] messenger.start dispatched for user %s", AGENT_ID, user_id)
        return self.status(user_id)

    async def stop(self, user_id: UUID) -> Dict[str, Any]:
        conn = extension_manager.get(user_id)
        if conn is not None:
            await conn.send({"type": "messenger.stop", "payload": {}})
            logger.info("[%s] messenger.stop dispatched for user %s", AGENT_ID, user_id)
        return self.status(user_id)

    async def send_message(self, user_id: UUID, thread_id: str, body: str) -> Dict[str, Any]:
        """Queue an outbound message and push it to the extension for sending."""
        body = (body or "").strip()
        if not body:
            raise AgentControlError("Message body cannot be empty.")

        thread = execute_with_connection(
            "SELECT id, fb_thread_id FROM messenger_threads WHERE id = %s AND user_id = %s",
            (thread_id, str(user_id)),
            fetch="one",
            row_factory=dict_row,
        )
        if thread is None:
            raise AgentControlError("Unknown thread.")

        conn = _require_connection(user_id)

        row = execute_with_connection(
            "INSERT INTO messenger_messages (thread_id, direction, sender, body, status) "
            "VALUES (%s, 'outbound', 'human', %s, 'queued') RETURNING id",
            (thread_id, body),
            fetch="one",
            row_factory=dict_row,
        )
        message_id = row["id"]

        request_id = uuid.uuid4().hex
        self._pending_sends[request_id] = {"user_id": user_id, "message_id": message_id}

        await conn.send({
            "type": "messenger.send",
            "payload": {
                "request_id": request_id,
                "fb_thread_id": thread["fb_thread_id"],
                "body": body,
            },
        })
        return self._serialize_message(self._get_message(message_id))

    async def set_ai_mode(self, user_id: UUID, thread_id: str, ai_mode: str) -> Dict[str, Any]:
        if ai_mode not in AI_MODE_VALUES:
            raise AgentControlError(f"ai_mode must be one of {AI_MODE_VALUES}")
        execute_with_connection(
            "UPDATE messenger_threads SET ai_mode = %s, updated_at = now() "
            "WHERE id = %s AND user_id = %s",
            (ai_mode, thread_id, str(user_id)),
        )
        return self.get_thread(user_id, thread_id)

    def status(self, user_id: UUID) -> Dict[str, Any]:
        conn = extension_manager.get(user_id)
        connection: Dict[str, Any] = {"connected": False} if conn is None else conn.info()

        counts = execute_with_connection(
            "SELECT "
            "  count(*) AS thread_count, "
            "  coalesce(sum(unread_count), 0) AS unread_count "
            "FROM messenger_threads WHERE user_id = %s",
            (str(user_id),),
            fetch="one",
            row_factory=dict_row,
        ) or {"thread_count": 0, "unread_count": 0}

        today = execute_with_connection(
            "SELECT "
            "  count(*) FILTER (WHERE direction = 'outbound' AND status != 'failed') AS sent_today, "
            "  count(*) FILTER (WHERE direction = 'outbound' AND status = 'failed') AS failed_today, "
            "  count(*) FILTER (WHERE direction = 'inbound') AS received_today "
            "FROM messenger_messages m "
            "JOIN messenger_threads t ON t.id = m.thread_id "
            "WHERE t.user_id = %s AND m.created_at >= date_trunc('day', now())",
            (str(user_id),),
            fetch="one",
            row_factory=dict_row,
        ) or {"sent_today": 0, "failed_today": 0, "received_today": 0}

        return {
            "agent_id": AGENT_ID,
            "status": "running" if connection.get("connected") else "idle",
            "worker_alive": connection.get("connected", False),
            "thread_count": int(counts["thread_count"]),
            "unread_count": int(counts["unread_count"]),
            "sent_today": int(today["sent_today"]),
            "failed_today": int(today["failed_today"]),
            "received_today": int(today["received_today"]),
            "connection": connection,
        }

    def list_threads(self, user_id: UUID, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        rows = execute_with_connection(
            "SELECT id, contact_id, listing_id, fb_thread_id, seller_name, "
            "       seller_profile_url, ai_mode, unread_count, last_message_at, "
            "       last_message_preview, created_at, updated_at "
            "FROM messenger_threads WHERE user_id = %s "
            "ORDER BY last_message_at DESC NULLS LAST, created_at DESC "
            "LIMIT %s OFFSET %s",
            (str(user_id), limit, offset),
            fetch="all",
            row_factory=dict_row,
        ) or []
        total_row = execute_with_connection(
            "SELECT count(*) AS total FROM messenger_threads WHERE user_id = %s",
            (str(user_id),),
            fetch="one",
            row_factory=dict_row,
        )
        return {
            "threads": [self._serialize_thread(r) for r in rows],
            "total": int(total_row["total"]) if total_row else 0,
        }

    def get_thread(self, user_id: UUID, thread_id: str) -> Dict[str, Any]:
        row = execute_with_connection(
            "SELECT id, contact_id, listing_id, fb_thread_id, seller_name, "
            "       seller_profile_url, ai_mode, unread_count, last_message_at, "
            "       last_message_preview, created_at, updated_at "
            "FROM messenger_threads WHERE id = %s AND user_id = %s",
            (thread_id, str(user_id)),
            fetch="one",
            row_factory=dict_row,
        )
        if row is None:
            raise AgentControlError("Unknown thread.")
        return self._serialize_thread(row)

    def list_messages(self, user_id: UUID, thread_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        owned = execute_with_connection(
            "SELECT id FROM messenger_threads WHERE id = %s AND user_id = %s",
            (thread_id, str(user_id)),
            fetch="one",
            row_factory=dict_row,
        )
        if owned is None:
            raise AgentControlError("Unknown thread.")

        rows = execute_with_connection(
            "SELECT id, thread_id, direction, sender, body, fb_message_id, "
            "       status, error, sent_at, created_at "
            "FROM messenger_messages WHERE thread_id = %s "
            "ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (thread_id, limit, offset),
            fetch="all",
            row_factory=dict_row,
        ) or []

        execute_with_connection(
            "UPDATE messenger_threads SET unread_count = 0 WHERE id = %s",
            (thread_id,),
        )

        return {"messages": [self._serialize_message(r) for r in reversed(rows)]}

    # ------------------------------------------------------------------ #
    # Event hooks — called from extension_ws.py when extension messages arrive
    # ------------------------------------------------------------------ #

    def on_thread_update(
        self, user_id: UUID, fb_thread_id: str, seller_name: str,
        seller_profile_url: Optional[str] = None, fb_seller_user_id: Optional[str] = None,
        listing_id: Optional[int] = None,
    ) -> None:
        contact_id = None
        if fb_seller_user_id:
            contact = execute_with_connection(
                "SELECT id FROM contacts WHERE fb_user_id = %s LIMIT 1",
                (fb_seller_user_id,),
                fetch="one",
                row_factory=dict_row,
            )
            if contact:
                contact_id = contact["id"]

        execute_with_connection(
            "INSERT INTO messenger_threads "
            "  (user_id, contact_id, listing_id, fb_thread_id, seller_name, seller_profile_url) "
            "VALUES (%s, %s, %s, %s, %s, %s) "
            "ON CONFLICT (user_id, fb_thread_id) DO UPDATE SET "
            "  seller_name = EXCLUDED.seller_name, "
            "  seller_profile_url = coalesce(EXCLUDED.seller_profile_url, messenger_threads.seller_profile_url), "
            "  contact_id = coalesce(EXCLUDED.contact_id, messenger_threads.contact_id), "
            "  listing_id = coalesce(EXCLUDED.listing_id, messenger_threads.listing_id), "
            "  updated_at = now()",
            (str(user_id), contact_id, listing_id, fb_thread_id, seller_name, seller_profile_url),
        )

    def on_message_received(
        self, user_id: UUID, fb_thread_id: str, body: str,
        fb_message_id: Optional[str] = None, sent_at: Optional[str] = None,
        seller_name: Optional[str] = None,
    ) -> None:
        thread = execute_with_connection(
            "SELECT id FROM messenger_threads WHERE user_id = %s AND fb_thread_id = %s",
            (str(user_id), fb_thread_id),
            fetch="one",
            row_factory=dict_row,
        )
        if thread is None:
            # Unknown thread reported a message before its thread.* event —
            # create a minimal thread row so the message isn't dropped.
            self.on_thread_update(user_id, fb_thread_id, seller_name or "Unknown seller")
            thread = execute_with_connection(
                "SELECT id FROM messenger_threads WHERE user_id = %s AND fb_thread_id = %s",
                (str(user_id), fb_thread_id),
                fetch="one",
                row_factory=dict_row,
            )

        thread_id = thread["id"]
        execute_with_connection(
            "INSERT INTO messenger_messages (thread_id, direction, sender, body, fb_message_id, status, sent_at) "
            "VALUES (%s, 'inbound', 'seller', %s, %s, 'delivered', coalesce(%s::timestamptz, now()))",
            (thread_id, body, fb_message_id, sent_at),
        )
        preview = body[:200]
        execute_with_connection(
            "UPDATE messenger_threads SET "
            "  unread_count = unread_count + 1, "
            "  last_message_at = now(), "
            "  last_message_preview = %s, "
            "  updated_at = now() "
            "WHERE id = %s",
            (preview, thread_id),
        )

    def on_send_result(self, request_id: str, ok: bool, fb_message_id: Optional[str] = None,
                        error: Optional[str] = None) -> None:
        pending = self._pending_sends.pop(request_id, None)
        if pending is None:
            return
        message_id = pending["message_id"]
        if ok:
            execute_with_connection(
                "UPDATE messenger_messages SET status = 'sent', fb_message_id = %s, sent_at = now() "
                "WHERE id = %s",
                (fb_message_id, message_id),
            )
            row = self._get_message(message_id)
            if row:
                execute_with_connection(
                    "UPDATE messenger_threads SET last_message_at = now(), "
                    "  last_message_preview = %s, updated_at = now() WHERE id = %s",
                    (row["body"][:200], row["thread_id"]),
                )
        else:
            execute_with_connection(
                "UPDATE messenger_messages SET status = 'failed', error = %s WHERE id = %s",
                ((error or "send failed")[:500], message_id),
            )

    def on_error(self, user_id: UUID, message: str) -> None:
        logger.warning("[%s] extension error for user %s: %s", AGENT_ID, user_id, message)

    # ------------------------------------------------------------------ #
    # Serialization helpers
    # ------------------------------------------------------------------ #

    def _get_message(self, message_id: Any) -> Optional[Dict[str, Any]]:
        return execute_with_connection(
            "SELECT id, thread_id, direction, sender, body, fb_message_id, "
            "       status, error, sent_at, created_at "
            "FROM messenger_messages WHERE id = %s",
            (message_id,),
            fetch="one",
            row_factory=dict_row,
        )

    @staticmethod
    def _iso(dt: Any) -> Optional[str]:
        if isinstance(dt, datetime):
            return dt.astimezone(timezone.utc).isoformat()
        return dt

    def _serialize_thread(self, row: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": str(row["id"]),
            "contact_id": str(row["contact_id"]) if row.get("contact_id") else None,
            "listing_id": row.get("listing_id"),
            "fb_thread_id": row["fb_thread_id"],
            "seller_name": row["seller_name"],
            "seller_profile_url": row.get("seller_profile_url"),
            "ai_mode": row["ai_mode"],
            "unread_count": int(row["unread_count"]),
            "last_message_at": self._iso(row.get("last_message_at")),
            "last_message_preview": row.get("last_message_preview"),
            "created_at": self._iso(row.get("created_at")),
            "updated_at": self._iso(row.get("updated_at")),
        }

    def _serialize_message(self, row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        if row is None:
            return {}
        return {
            "id": str(row["id"]),
            "thread_id": str(row["thread_id"]),
            "direction": row["direction"],
            "sender": row["sender"],
            "body": row["body"],
            "fb_message_id": row.get("fb_message_id"),
            "status": row["status"],
            "error": row.get("error"),
            "sent_at": self._iso(row.get("sent_at")),
            "created_at": self._iso(row.get("created_at")),
        }


# Module-level singleton
fb_messenger_agent = FbMessengerRunner()
