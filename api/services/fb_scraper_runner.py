"""
FB Marketplace Scraper Agent — per-user remote control of a Chrome extension.

Unlike the damage-detection and CRM agents (which run as global singletons
inside the FastAPI process), the actual scraping happens in the user's
browser via a Chrome extension. This module:

  * pushes control commands to the connected extension over WebSocket
    (`scrape.start`, `scrape.stop`, `templates.refresh`)
  * mirrors the extension's status updates into the fb_scraper_state table
    so the dashboard card can show progress / last-run summary
  * persists last-used filters per user

There is no background worker thread — the loop runs in the extension. The
runner is just a thin DB+WS bridge.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional
from uuid import UUID

from psycopg.rows import dict_row

from ..core.db_helpers import execute_with_connection
from .ws_extension_manager import extension_manager

logger = logging.getLogger(__name__)

AGENT_ID = "fb-scraper"

# Statuses persisted in fb_scraper_state.status
S_IDLE, S_RUNNING, S_STOPPED, S_COMPLETED, S_ERROR = (
    "idle", "running", "stopped", "completed", "error",
)

# Filter field names accepted on start — must match the extension's popup form.
_FILTER_FIELDS = (
    "location", "minPrice", "maxPrice", "minYear", "maxYear",
    "minMileage", "maxMileage", "radius", "startTime", "endTime",
    "maxListings", "exact",
)


class AgentControlError(Exception):
    """Raised when a control action is invalid for the agent's current state."""


def _sanitize_filters(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Keep only the fields the extension expects; coerce types loosely."""
    out: Dict[str, Any] = {}
    if not isinstance(raw, dict):
        return out
    for k in _FILTER_FIELDS:
        if k in raw:
            out[k] = raw[k]
    return out


class FbScraperRunner:
    """Per-user remote control of a Chrome extension."""

    agent_id = AGENT_ID

    # ------------------------------------------------------------------ #
    # Persistence
    # ------------------------------------------------------------------ #

    def _read_state(self, user_id: UUID) -> Dict[str, Any]:
        row = execute_with_connection(
            "SELECT user_id, status, filters, total, processed, succeeded, "
            "       failed, skipped, last_error, started_at, updated_at "
            "FROM fb_scraper_state WHERE user_id = %s",
            (str(user_id),),
            fetch="one",
            row_factory=dict_row,
        )
        if row is None:
            return {
                "user_id": str(user_id), "status": S_IDLE, "filters": None,
                "total": 0, "processed": 0, "succeeded": 0, "failed": 0, "skipped": 0,
                "last_error": None, "started_at": None, "updated_at": None,
            }
        return dict(row)

    def _write_state(self, user_id: UUID, **fields: Any) -> None:
        allowed = {
            "status", "filters", "total", "processed", "succeeded",
            "failed", "skipped", "last_error", "started_at",
        }
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return
        columns = ", ".join(updates.keys())
        placeholders = ", ".join(["%s"] * len(updates))
        set_clause = ", ".join(f"{k} = EXCLUDED.{k}" for k in updates)
        execute_with_connection(
            f"INSERT INTO fb_scraper_state (user_id, {columns}, updated_at) "
            f"VALUES (%s, {placeholders}, now()) "
            f"ON CONFLICT (user_id) DO UPDATE SET {set_clause}, updated_at = now()",
            (str(user_id), *updates.values()),
        )

    def _bump(self, user_id: UUID, **deltas: int) -> None:
        """Increment counters atomically."""
        if not deltas:
            return
        sets = ", ".join(f"{k} = {k} + %s" for k in deltas)
        execute_with_connection(
            f"UPDATE fb_scraper_state SET {sets}, updated_at = now() WHERE user_id = %s",
            (*deltas.values(), str(user_id)),
        )

    # ------------------------------------------------------------------ #
    # Public control API (called from the FastAPI routes)
    # ------------------------------------------------------------------ #

    async def start(self, user_id: UUID, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Push a scrape.start command to the user's extension."""
        conn = extension_manager.get(user_id)
        if conn is None:
            raise AgentControlError(
                "No extension connected. Open the FB Marketplace Inspector "
                "extension and sign in to the dashboard from its popup."
            )
        if conn.fb_logged_in is False:
            raise AgentControlError(
                "The connected extension reports you are not logged in to Facebook."
            )
        if not conn.captured_template_names:
            raise AgentControlError(
                "No FB Marketplace templates captured yet. Browse one FB "
                "Marketplace listing in the extension's tab, then try again."
            )

        clean = _sanitize_filters(filters or {})

        # Optimistic state — `scrape.started` from the extension will refine it.
        self._write_state(
            user_id,
            status=S_RUNNING,
            filters=json.dumps(clean),
            total=0,
            processed=0,
            succeeded=0,
            failed=0,
            skipped=0,
            last_error=None,
        )
        execute_with_connection(
            "UPDATE fb_scraper_state SET started_at = now() WHERE user_id = %s",
            (str(user_id),),
        )

        await conn.send({"type": "scrape.start", "payload": clean})
        logger.info("[%s] scrape.start dispatched for user %s", AGENT_ID, user_id)
        return self.status(user_id)

    async def stop(self, user_id: UUID) -> Dict[str, Any]:
        """Push a scrape.stop command. State flips on `scrape.done` / drop."""
        conn = extension_manager.get(user_id)
        if conn is None:
            # Reconcile stale state — extension may have crashed or unplugged.
            state = self._read_state(user_id)
            if state["status"] == S_RUNNING:
                self._write_state(user_id, status=S_STOPPED)
            return self.status(user_id)

        await conn.send({"type": "scrape.stop", "payload": {}})
        self._write_state(user_id, status=S_STOPPED)
        logger.info("[%s] scrape.stop dispatched for user %s", AGENT_ID, user_id)
        return self.status(user_id)

    async def refresh_templates(self, user_id: UUID) -> Dict[str, Any]:
        """Ask the extension to re-read captured templates from chrome.storage."""
        conn = extension_manager.get(user_id)
        if conn is None:
            raise AgentControlError("No extension connected.")
        await conn.send({"type": "templates.refresh", "payload": {}})
        return self.status(user_id)

    def status(self, user_id: UUID) -> Dict[str, Any]:
        state = self._read_state(user_id)
        conn = extension_manager.get(user_id)
        connection: Dict[str, Any]
        if conn is None:
            connection = {"connected": False}
        else:
            connection = conn.info()

        filters = state.get("filters")
        if isinstance(filters, str):
            try:
                filters = json.loads(filters)
            except Exception:
                filters = None

        total = int(state["total"] or 0)
        processed = int(state["processed"] or 0)
        remaining = max(0, total - processed) if total else 0
        return {
            "agent_id": AGENT_ID,
            "status": state["status"],
            "worker_alive": connection["connected"],
            "total": total,
            "processed": processed,
            "succeeded": int(state["succeeded"] or 0),
            "failed": int(state["failed"] or 0),
            "skipped": int(state["skipped"] or 0),
            "remaining": remaining,
            "progress_pct": round(100 * processed / total, 1) if total else 0,
            "run_config": filters,           # surfaced as filters on the frontend
            "last_error": state["last_error"],
            "started_at": state["started_at"].isoformat() if state.get("started_at") else None,
            "updated_at": state["updated_at"].isoformat() if state.get("updated_at") else None,
            "connection": connection,
        }

    # ------------------------------------------------------------------ #
    # Event hooks — called from extension_ws.py when extension messages arrive
    # ------------------------------------------------------------------ #

    def on_started(self, user_id: UUID) -> None:
        self._write_state(user_id, status=S_RUNNING, last_error=None)

    def on_progress(
        self, user_id: UUID,
        total: Optional[int] = None, processed: Optional[int] = None,
        succeeded: Optional[int] = None, failed: Optional[int] = None,
        skipped: Optional[int] = None,
    ) -> None:
        updates: Dict[str, Any] = {}
        if isinstance(total, int):     updates["total"] = total
        if isinstance(processed, int): updates["processed"] = processed
        if isinstance(succeeded, int): updates["succeeded"] = succeeded
        if isinstance(failed, int):    updates["failed"] = failed
        if isinstance(skipped, int):   updates["skipped"] = skipped
        if updates:
            self._write_state(user_id, **updates)

    def on_listing(self, user_id: UUID) -> None:
        """Single listing forwarded — bump processed+succeeded."""
        self._bump(user_id, processed=1, succeeded=1)

    def on_done(
        self, user_id: UUID,
        total: Optional[int] = None, processed: Optional[int] = None,
        succeeded: Optional[int] = None, failed: Optional[int] = None,
        skipped: Optional[int] = None,
    ) -> None:
        updates: Dict[str, Any] = {"status": S_COMPLETED}
        if isinstance(total, int):     updates["total"] = total
        if isinstance(processed, int): updates["processed"] = processed
        if isinstance(succeeded, int): updates["succeeded"] = succeeded
        if isinstance(failed, int):    updates["failed"] = failed
        if isinstance(skipped, int):   updates["skipped"] = skipped
        self._write_state(user_id, **updates)

    def on_error(self, user_id: UUID, message: str) -> None:
        self._write_state(user_id, status=S_ERROR, last_error=message)


# Module-level singleton
fb_scraper_agent = FbScraperRunner()
