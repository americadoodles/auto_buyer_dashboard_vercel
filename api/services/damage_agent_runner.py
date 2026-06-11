# Damage Detection Agent Runner
#
# A controllable background worker that walks the listings table, runs vision
# damage detection on each listing's images, and persists JSON reports.
#
# Control model:
#   start  -> begins a fresh run (or continues where a previous run left off)
#   pause  -> worker parks between listings; in-flight listing finishes first
#   resume -> un-parks a paused worker; if the process restarted, restarts the
#             worker from the DB-persisted cursor (resume survives restarts)
#   stop   -> worker exits; cursor is kept so a later start/resume continues
#
# State is persisted in the agent_state table after every listing so progress
# is never lost, and the in-process thread only ever exists as a singleton.

from typing import Any, Dict, List, Optional, Tuple
from datetime import date
import json
import logging
import threading

from psycopg.rows import dict_row

from ..core.config import settings
from ..core.db_helpers import execute_with_connection
from .damage_detection_service import analyze_listing_images

logger = logging.getLogger(__name__)

AGENT_ID = "damage-detection"

# Body styles that are definitively NOT passenger / light commercial vehicles.
# Most listings have a null body_style, so this is only a cheap pre-filter —
# authoritative classification happens in the vision model (vehicle_category).
EXCLUDED_BODY_STYLES = (
    "motorcycle", "motorbike", "scooter", "atv", "utv", "dirt bike",
    "bus", "rv", "motorhome", "camper", "trailer", "boat",
    "semi", "semi-truck", "tractor", "forklift", "excavator",
)

# Statuses persisted in agent_state.status
S_IDLE, S_RUNNING, S_PAUSED, S_STOPPED, S_COMPLETED, S_ERROR = (
    "idle", "running", "paused", "stopped", "completed", "error",
)

_PAUSE_POLL_SECONDS = 0.5  # how often a paused worker re-checks for resume/stop


class AgentControlError(Exception):
    """Raised when a control action is invalid for the agent's current state."""


def _parse_iso_date(value: Optional[str], field: str) -> Optional[date]:
    if value is None or value == "":
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise AgentControlError(f"Invalid {field}: expected YYYY-MM-DD, got {value!r}")


def _validate_run_config(date_from: Optional[str], date_to: Optional[str]) -> Dict[str, Any]:
    """Validate and normalize run parameters into the persisted run_config."""
    d_from = _parse_iso_date(date_from, "date_from")
    d_to = _parse_iso_date(date_to, "date_to")
    if d_from and d_to and d_from > d_to:
        raise AgentControlError("date_from must be on or before date_to")
    return {
        "date_from": d_from.isoformat() if d_from else None,
        "date_to": d_to.isoformat() if d_to else None,
    }


def _candidate_filters(config: Dict[str, Any]) -> Tuple[str, List[Any]]:
    """Extra WHERE clauses + params implementing the run_config filters."""
    clauses: List[str] = []
    params: List[Any] = []

    # Ingested date range (inclusive on both ends; created_at is timestamptz).
    if config.get("date_from"):
        clauses.append("l.created_at >= %s::date")
        params.append(config["date_from"])
    if config.get("date_to"):
        clauses.append("l.created_at < (%s::date + interval '1 day')")
        params.append(config["date_to"])

    # Cheap pre-filter: drop listings whose body_style is explicitly out of
    # scope. Null/unknown body styles pass through — the vision model is the
    # authoritative classifier and marks those 'skipped'.
    clauses.append(
        "(l.body_style IS NULL OR lower(l.body_style) NOT IN ("
        + ", ".join(["%s"] * len(EXCLUDED_BODY_STYLES)) + "))"
    )
    params.extend(EXCLUDED_BODY_STYLES)

    return (" AND " + " AND ".join(clauses), params) if clauses else ("", [])


class DamageAgentRunner:
    """Singleton thread-based runner for the damage detection agent."""

    agent_id = AGENT_ID  # registry key; same public API as CrmAgentRunner

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._pause_event = threading.Event()

    # ------------------------------------------------------------------ #
    # Persistence helpers
    # ------------------------------------------------------------------ #

    def _read_state(self) -> Dict[str, Any]:
        row = execute_with_connection(
            "SELECT agent_id, status, cursor_listing_id, total, processed, succeeded, "
            "       failed, skipped, last_error, started_at, updated_at, run_config "
            "FROM agent_state WHERE agent_id = %s",
            (AGENT_ID,),
            fetch="one",
            row_factory=dict_row,
        )
        if row is None:
            return {
                "agent_id": AGENT_ID, "status": S_IDLE, "cursor_listing_id": None,
                "total": 0, "processed": 0, "succeeded": 0, "failed": 0, "skipped": 0,
                "last_error": None, "started_at": None, "updated_at": None,
                "run_config": None,
            }
        return dict(row)

    def _write_state(self, **fields: Any) -> None:
        """Upsert agent_state, updating only the provided columns."""
        allowed = {
            "status", "cursor_listing_id", "total", "processed",
            "succeeded", "failed", "skipped", "last_error", "started_at",
            "run_config",
        }
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return
        columns = ", ".join(updates.keys())
        placeholders = ", ".join(["%s"] * len(updates))
        set_clause = ", ".join(f"{k} = EXCLUDED.{k}" for k in updates)
        execute_with_connection(
            f"INSERT INTO agent_state (agent_id, {columns}, updated_at) "
            f"VALUES (%s, {placeholders}, now()) "
            f"ON CONFLICT (agent_id) DO UPDATE SET {set_clause}, updated_at = now()",
            (AGENT_ID, *updates.values()),
        )

    def _count_pending(self, after_id: int, config: Dict[str, Any]) -> int:
        extra_sql, extra_params = _candidate_filters(config)
        row = execute_with_connection(
            f"""
            SELECT COUNT(*) FROM listings l
            WHERE l.id > %s
              AND l.images IS NOT NULL AND array_length(l.images, 1) > 0
              AND NOT EXISTS (
                    SELECT 1 FROM damage_reports dr
                    WHERE dr.listing_id = l.id AND dr.status IN ('completed', 'skipped')
              ){extra_sql}
            """,
            (after_id, *extra_params),
            fetch="one",
        )
        return int(row[0]) if row else 0

    def _next_listing(self, after_id: int, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        extra_sql, extra_params = _candidate_filters(config)
        row = execute_with_connection(
            f"""
            SELECT l.id, l.year, l.make, l.model, l.trim, l.images
            FROM listings l
            WHERE l.id > %s
              AND l.images IS NOT NULL AND array_length(l.images, 1) > 0
              AND NOT EXISTS (
                    SELECT 1 FROM damage_reports dr
                    WHERE dr.listing_id = l.id AND dr.status IN ('completed', 'skipped')
              ){extra_sql}
            ORDER BY l.id ASC
            LIMIT 1
            """,
            (after_id, *extra_params),
            fetch="one",
            row_factory=dict_row,
        )
        return dict(row) if row else None

    def _upsert_report(
        self,
        listing_id: int,
        status: str,
        report: Optional[str] = None,   # JSON string
        model: Optional[str] = None,
        images_analyzed: int = 0,
        error: Optional[str] = None,
    ) -> None:
        execute_with_connection(
            """
            INSERT INTO damage_reports (listing_id, status, report, model, images_analyzed, error, updated_at)
            VALUES (%s, %s, %s::jsonb, %s, %s, %s, now())
            ON CONFLICT (listing_id) DO UPDATE SET
                status = EXCLUDED.status,
                report = EXCLUDED.report,
                model = EXCLUDED.model,
                images_analyzed = EXCLUDED.images_analyzed,
                error = EXCLUDED.error,
                updated_at = now()
            """,
            (listing_id, status, report, model, images_analyzed, error),
        )

    # ------------------------------------------------------------------ #
    # Worker
    # ------------------------------------------------------------------ #

    def _run(self, start_after_id: int, config: Dict[str, Any]) -> None:
        cursor = start_after_id
        try:
            while not self._stop_event.is_set():
                # Park while paused; stop wins over pause.
                while self._pause_event.is_set() and not self._stop_event.is_set():
                    self._stop_event.wait(_PAUSE_POLL_SECONDS)
                if self._stop_event.is_set():
                    break

                listing = self._next_listing(cursor, config)
                if listing is None:
                    self._write_state(status=S_COMPLETED)
                    logger.info("[%s] run complete — no more pending listings", AGENT_ID)
                    return

                listing_id = int(listing["id"])
                self._upsert_report(listing_id, "processing")
                logger.info("[%s] analyzing listing %s (%s images)",
                            AGENT_ID, listing_id, len(listing.get("images") or []))

                try:
                    result = analyze_listing_images(listing)
                    report = result["report"]
                    # Out-of-scope vehicle (not passenger / light commercial):
                    # keep the classification but mark 'skipped' so it is never
                    # re-analyzed and never shows up as a damage report.
                    in_scope = report.get("in_scope", True)
                    self._upsert_report(
                        listing_id,
                        "completed" if in_scope else "skipped",
                        report=json.dumps(report),
                        model=result["model"],
                        images_analyzed=result["images_analyzed"],
                    )
                    if in_scope:
                        self._bump_counters(listing_id, succeeded=True)
                    else:
                        logger.info("[%s] listing %s out of scope (%s) — skipped",
                                    AGENT_ID, listing_id, report.get("vehicle_category"))
                        self._bump_counters(listing_id, succeeded=False, skipped=True)
                except Exception as e:
                    # Per-listing failures don't kill the run — record and move on.
                    err = str(e)[:1000]
                    logger.warning("[%s] listing %s failed: %s", AGENT_ID, listing_id, err)
                    self._upsert_report(listing_id, "failed", error=err)
                    self._bump_counters(listing_id, succeeded=False, error=err)

                cursor = listing_id

            # Stopped by user — persist final status (cursor already saved per item).
            self._write_state(status=S_STOPPED)
            logger.info("[%s] stopped at cursor %s", AGENT_ID, cursor)
        except Exception:
            logger.exception("[%s] worker crashed", AGENT_ID)
            self._write_state(status=S_ERROR, last_error="worker crashed — see server logs")

    def _bump_counters(
        self, listing_id: int, succeeded: bool,
        error: Optional[str] = None, skipped: bool = False,
    ) -> None:
        failed = 0 if (succeeded or skipped) else 1
        execute_with_connection(
            """
            UPDATE agent_state SET
                cursor_listing_id = %s,
                processed = processed + 1,
                succeeded = succeeded + %s,
                failed = failed + %s,
                skipped = skipped + %s,
                last_error = COALESCE(%s, last_error),
                updated_at = now()
            WHERE agent_id = %s
            """,
            (listing_id, 1 if succeeded else 0, failed, 1 if skipped else 0, error, AGENT_ID),
        )

    def _spawn(self, start_after_id: int, config: Dict[str, Any]) -> None:
        self._stop_event.clear()
        self._pause_event.clear()
        self._thread = threading.Thread(
            target=self._run, args=(start_after_id, config),
            name=f"{AGENT_ID}-worker", daemon=True,
        )
        self._thread.start()

    def _worker_alive(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    # ------------------------------------------------------------------ #
    # Public control API
    # ------------------------------------------------------------------ #

    def start(
        self,
        restart: bool = False,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Start a run over listings ingested within [date_from, date_to]
        (YYYY-MM-DD, both optional/inclusive). Only passenger and light
        commercial vehicles are analyzed — other vehicle classes are
        classified by the vision model and recorded as 'skipped'.

        `restart=True` resets the cursor and counters and rescans all pending
        listings from the beginning; otherwise continues after the persisted
        cursor (already completed/skipped listings are never re-analyzed).
        """
        if not settings.AI_ENABLED or not settings.OPENAI_API_KEY:
            raise AgentControlError("AI is not configured (OPENAI_API_KEY missing)")

        config = _validate_run_config(date_from, date_to)

        with self._lock:
            if self._worker_alive():
                raise AgentControlError("Agent is already running — stop or pause it first")

            state = self._read_state()
            start_after = 0 if restart else int(state.get("cursor_listing_id") or 0)
            total = self._count_pending(start_after, config)
            if total == 0:
                raise AgentControlError(
                    "No pending listings with images match the current filters"
                )

            self._write_state(
                status=S_RUNNING,
                cursor_listing_id=start_after or None,
                total=total,
                processed=0,
                succeeded=0,
                failed=0,
                skipped=0,
                last_error=None,
                run_config=json.dumps(config),
            )
            execute_with_connection(
                "UPDATE agent_state SET started_at = now() WHERE agent_id = %s",
                (AGENT_ID,),
            )
            self._spawn(start_after, config)
            logger.info("[%s] started (restart=%s, pending=%s, config=%s)",
                        AGENT_ID, restart, total, config)
            return self.status()

    def pause(self) -> Dict[str, Any]:
        with self._lock:
            if not self._worker_alive():
                raise AgentControlError("Agent is not running")
            if self._pause_event.is_set():
                raise AgentControlError("Agent is already paused")
            self._pause_event.set()
            self._write_state(status=S_PAUSED)
            logger.info("[%s] paused", AGENT_ID)
            return self.status()

    def resume(self) -> Dict[str, Any]:
        with self._lock:
            if self._worker_alive():
                if not self._pause_event.is_set():
                    raise AgentControlError("Agent is already running")
                self._pause_event.clear()
                self._write_state(status=S_RUNNING)
                logger.info("[%s] resumed (in-process)", AGENT_ID)
                return self.status()

            # Process restarted (or worker exited): resume from persisted cursor
            # with the same run_config the run was started with.
            state = self._read_state()
            if state["status"] not in (S_PAUSED, S_STOPPED, S_ERROR):
                raise AgentControlError("Nothing to resume — start the agent instead")
            if not settings.AI_ENABLED or not settings.OPENAI_API_KEY:
                raise AgentControlError("AI is not configured (OPENAI_API_KEY missing)")

            config = state.get("run_config") or {}
            cursor = int(state.get("cursor_listing_id") or 0)
            remaining = self._count_pending(cursor, config)
            if remaining == 0:
                self._write_state(status=S_COMPLETED)
                raise AgentControlError("Nothing left to process — run already complete")

            self._write_state(status=S_RUNNING, last_error=None)
            self._spawn(cursor, config)
            logger.info("[%s] resumed from cursor %s (%s remaining, config=%s)",
                        AGENT_ID, cursor, remaining, config)
            return self.status()

    def stop(self) -> Dict[str, Any]:
        with self._lock:
            if not self._worker_alive():
                # Reconcile stale DB state (e.g. process died while 'running').
                state = self._read_state()
                if state["status"] in (S_RUNNING, S_PAUSED):
                    self._write_state(status=S_STOPPED)
                    return self.status()
                raise AgentControlError("Agent is not running")
            self._stop_event.set()
            self._pause_event.clear()  # unblock a paused worker so it can exit
            logger.info("[%s] stop requested", AGENT_ID)
            return self.status(override_status=S_STOPPED)

    def status(self, override_status: Optional[str] = None) -> Dict[str, Any]:
        state = self._read_state()
        alive = self._worker_alive()
        status = override_status or state["status"]
        # Reconcile: DB says running/paused but no worker exists in this process
        # (server restarted mid-run) — report as paused so the UI offers Resume.
        if status in (S_RUNNING, S_PAUSED) and not alive and override_status is None:
            status = S_PAUSED
        remaining = max(0, int(state["total"]) - int(state["processed"]))
        return {
            "agent_id": AGENT_ID,
            "status": status,
            "worker_alive": alive,
            "cursor_listing_id": state["cursor_listing_id"],
            "total": state["total"],
            "processed": state["processed"],
            "succeeded": state["succeeded"],
            "failed": state["failed"],
            "skipped": state.get("skipped", 0),
            "remaining": remaining,
            "progress_pct": round(100 * state["processed"] / state["total"], 1) if state["total"] else 0,
            "run_config": state.get("run_config"),
            "last_error": state["last_error"],
            "started_at": state["started_at"].isoformat() if state.get("started_at") else None,
            "updated_at": state["updated_at"].isoformat() if state.get("updated_at") else None,
        }

    def reports(
        self,
        status: Optional[str] = None,
        since_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Optional[Dict[str, Any]]:
        """Damage reports normalized to the generic agent-report shape
        (entity_type='listing', entity_id=listing id, entity_label=vehicle).
        Returns None when the DB is unavailable.
        """
        where: List[str] = []
        params: List[Any] = []
        if status:
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
                   l.vin, l.year, l.make, l.model AS vehicle_model, l.trim, l.price
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
            return None
        count_row = execute_with_connection(
            f"SELECT COUNT(*) FROM damage_reports dr {where_sql}",
            tuple(params),
            fetch="one",
        )

        reports = []
        for r in rows:
            r = dict(r)
            vehicle = " ".join(
                str(v) for v in (r.get("year"), r.get("make"), r.get("vehicle_model"), r.get("trim")) if v
            )
            reports.append({
                "id": r["id"],
                "agent_id": self.agent_id,
                "entity_type": "listing",
                "entity_id": str(r["listing_id"]),
                "entity_label": vehicle or f"listing #{r['listing_id']}",
                "status": r["status"],
                "report": r["report"],
                "model": r["model"],
                "error": r["error"],
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
                "updated_at": r["updated_at"].isoformat() if r.get("updated_at") else None,
                # damage-specific extras
                "images_analyzed": r.get("images_analyzed"),
                "vin": r.get("vin"),
                "price": float(r["price"]) if r.get("price") is not None else None,
            })
        return {
            "reports": reports,
            "total": int(count_row[0]) if count_row else 0,
            "limit": limit,
            "offset": offset,
        }


# Module-level singleton — FastAPI imports and shares this instance.
damage_agent = DamageAgentRunner()
