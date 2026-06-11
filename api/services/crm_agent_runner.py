# CRM Agent Runner — generic controllable background worker for CRM agents
#
# One state machine serves all CRM agents (lead-scoring, deal-risk,
# followup-drafter, task-generator); each agent subclasses CrmAgentRunner and
# supplies its candidate queries + AI processor. Reports go to the shared
# agent_reports table; control state lives in agent_state (one row per agent).
#
# Control model (same UX as the damage agent):
#   start   -> analyze pending entities (entities with completed/skipped
#              reports are never re-analyzed)
#   restart -> DELETE this agent's previous reports, analyze everything fresh
#   pause   -> worker parks between items; in-flight item finishes first
#   resume  -> un-parks; if the process restarted, restarts the worker from
#              persisted state (no cursor needed — see exclusion rule below)
#   stop    -> worker exits; a later start/resume continues where it left off
#
# Pending-item exclusion rule (replaces the int cursor used for listings,
# because CRM entities have UUID keys with no sequential order):
#   an entity is pending unless it has a report with
#     status IN ('completed', 'skipped')                 -- done in any run
#     OR (status = 'failed' AND updated_at >= started_at) -- failed THIS run
# Failures from previous runs are therefore retried automatically, while
# failures within the current run can never wedge the loop.

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
from datetime import date, datetime
import json
import logging
import threading

from psycopg.rows import dict_row

from ..core.config import settings
from ..core.db_helpers import execute_with_connection
from . import crm_agent_service

logger = logging.getLogger(__name__)

S_IDLE, S_RUNNING, S_PAUSED, S_STOPPED, S_COMPLETED, S_ERROR = (
    "idle", "running", "paused", "stopped", "completed", "error",
)

_PAUSE_POLL_SECONDS = 0.5


class AgentControlError(Exception):
    """Invalid control action for the agent's current state."""


class AgentSkipItem(Exception):
    """Raised by a processor to mark an item out of scope (status 'skipped')."""


def _parse_iso_date(value: Optional[str], field: str) -> Optional[date]:
    if value is None or value == "":
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise AgentControlError(f"Invalid {field}: expected YYYY-MM-DD, got {value!r}")


def _validate_run_config(date_from: Optional[str], date_to: Optional[str]) -> Dict[str, Any]:
    d_from = _parse_iso_date(date_from, "date_from")
    d_to = _parse_iso_date(date_to, "date_to")
    if d_from and d_to and d_from > d_to:
        raise AgentControlError("date_from must be on or before date_to")
    return {
        "date_from": d_from.isoformat() if d_from else None,
        "date_to": d_to.isoformat() if d_to else None,
    }


def _date_filter(alias: str, config: Dict[str, Any]) -> Tuple[str, List[Any]]:
    """WHERE fragment limiting <alias>.created_at to the configured range."""
    sql, params = "", []
    if config.get("date_from"):
        sql += f" AND {alias}.created_at >= %s::date"
        params.append(config["date_from"])
    if config.get("date_to"):
        sql += f" AND {alias}.created_at < (%s::date + interval '1 day')"
        params.append(config["date_to"])
    return sql, params


def _exclusion(agent_id: str, entity_type_expr: str, entity_id_expr: str) -> str:
    """NOT EXISTS fragment implementing the pending-item exclusion rule.

    Caller must append params: (agent_id, run_started_at).
    entity_type_expr / entity_id_expr are SQL expressions (trusted literals
    from this module — never user input).
    """
    return f"""NOT EXISTS (
        SELECT 1 FROM agent_reports r
        WHERE r.agent_id = %s
          AND r.entity_type = {entity_type_expr}
          AND r.entity_id = {entity_id_expr}
          AND (r.status IN ('completed', 'skipped')
               OR (r.status = 'failed' AND r.updated_at >= %s))
    )"""


class CrmAgentRunner(ABC):
    """Base controllable runner; subclasses define queries + AI processing."""

    agent_id: str = ""  # override in subclasses

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._pause_event = threading.Event()

    # ------------------------------------------------------------------ #
    # Subclass contract
    # ------------------------------------------------------------------ #

    @abstractmethod
    def _count_pending(self, config: Dict[str, Any], run_started_at: datetime) -> int:
        """How many entities match the filters and have no blocking report."""

    @abstractmethod
    def _next_item(self, config: Dict[str, Any], run_started_at: datetime) -> Optional[Dict[str, Any]]:
        """Next pending entity with full AI context. Must include keys:
        entity_type, entity_id (str), entity_label, context (dict)."""

    @abstractmethod
    def _process(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Run the AI analysis; return the report dict.
        Raise AgentSkipItem to mark out of scope; any other exception fails the item."""

    # ------------------------------------------------------------------ #
    # State persistence (agent_state)
    # ------------------------------------------------------------------ #

    def _read_state(self) -> Dict[str, Any]:
        row = execute_with_connection(
            "SELECT agent_id, status, total, processed, succeeded, failed, skipped, "
            "       last_error, started_at, updated_at, run_config "
            "FROM agent_state WHERE agent_id = %s",
            (self.agent_id,),
            fetch="one",
            row_factory=dict_row,
        )
        if row is None:
            return {
                "agent_id": self.agent_id, "status": S_IDLE,
                "total": 0, "processed": 0, "succeeded": 0, "failed": 0, "skipped": 0,
                "last_error": None, "started_at": None, "updated_at": None,
                "run_config": None,
            }
        return dict(row)

    def _write_state(self, **fields: Any) -> None:
        allowed = {
            "status", "total", "processed", "succeeded", "failed", "skipped",
            "last_error", "run_config",
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
            (self.agent_id, *updates.values()),
        )

    def _upsert_report(
        self,
        item: Dict[str, Any],
        status: str,
        report: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        execute_with_connection(
            """
            INSERT INTO agent_reports
                (agent_id, entity_type, entity_id, entity_label, status, report, model, error, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, now())
            ON CONFLICT (agent_id, entity_type, entity_id) DO UPDATE SET
                entity_label = EXCLUDED.entity_label,
                status = EXCLUDED.status,
                report = EXCLUDED.report,
                model = EXCLUDED.model,
                error = EXCLUDED.error,
                updated_at = now()
            """,
            (
                self.agent_id, item["entity_type"], item["entity_id"],
                item.get("entity_label"), status,
                json.dumps(report) if report is not None else None,
                model, error,
            ),
        )

    def _bump_counters(self, succeeded: bool, skipped: bool = False, error: Optional[str] = None) -> None:
        failed = 0 if (succeeded or skipped) else 1
        execute_with_connection(
            """
            UPDATE agent_state SET
                processed = processed + 1,
                succeeded = succeeded + %s,
                failed = failed + %s,
                skipped = skipped + %s,
                last_error = COALESCE(%s, last_error),
                updated_at = now()
            WHERE agent_id = %s
            """,
            (1 if succeeded else 0, failed, 1 if skipped else 0, error, self.agent_id),
        )

    # ------------------------------------------------------------------ #
    # Worker
    # ------------------------------------------------------------------ #

    def _run(self, config: Dict[str, Any], run_started_at: datetime) -> None:
        try:
            while not self._stop_event.is_set():
                while self._pause_event.is_set() and not self._stop_event.is_set():
                    self._stop_event.wait(_PAUSE_POLL_SECONDS)
                if self._stop_event.is_set():
                    break

                item = self._next_item(config, run_started_at)
                if item is None:
                    self._write_state(status=S_COMPLETED)
                    logger.info("[%s] run complete", self.agent_id)
                    return

                self._upsert_report(item, "processing")
                logger.info("[%s] analyzing %s %s", self.agent_id,
                            item["entity_type"], item["entity_id"])
                try:
                    report = self._process(item)
                    self._upsert_report(item, "completed", report=report,
                                        model=crm_agent_service.CRM_MODEL)
                    self._bump_counters(succeeded=True)
                except AgentSkipItem as skip:
                    self._upsert_report(item, "skipped",
                                        report={"skip_reason": str(skip)},
                                        model=crm_agent_service.CRM_MODEL)
                    self._bump_counters(succeeded=False, skipped=True)
                except Exception as e:
                    err = str(e)[:1000]
                    logger.warning("[%s] %s %s failed: %s", self.agent_id,
                                   item["entity_type"], item["entity_id"], err)
                    self._upsert_report(item, "failed", error=err)
                    self._bump_counters(succeeded=False, error=err)

            self._write_state(status=S_STOPPED)
            logger.info("[%s] stopped", self.agent_id)
        except Exception:
            logger.exception("[%s] worker crashed", self.agent_id)
            self._write_state(status=S_ERROR, last_error="worker crashed — see server logs")

    def _spawn(self, config: Dict[str, Any], run_started_at: datetime) -> None:
        self._stop_event.clear()
        self._pause_event.clear()
        self._thread = threading.Thread(
            target=self._run, args=(config, run_started_at),
            name=f"{self.agent_id}-worker", daemon=True,
        )
        self._thread.start()

    def _worker_alive(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    @staticmethod
    def _require_ai() -> None:
        if not settings.AI_ENABLED or not settings.OPENAI_API_KEY:
            raise AgentControlError("AI is not configured (OPENAI_API_KEY missing)")

    def _mark_started_now(self) -> datetime:
        row = execute_with_connection(
            "UPDATE agent_state SET started_at = now() WHERE agent_id = %s RETURNING started_at",
            (self.agent_id,),
            fetch="one",
        )
        if not row:
            raise AgentControlError("Failed to persist run start time")
        return row[0]

    # ------------------------------------------------------------------ #
    # Public control API
    # ------------------------------------------------------------------ #

    def start(
        self,
        restart: bool = False,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        self._require_ai()
        config = _validate_run_config(date_from, date_to)

        with self._lock:
            if self._worker_alive():
                raise AgentControlError("Agent is already running — stop or pause it first")

            if restart:
                # Fresh run: wipe this agent's previous reports so everything
                # in range is re-analyzed with current data.
                execute_with_connection(
                    "DELETE FROM agent_reports WHERE agent_id = %s", (self.agent_id,)
                )

            # Ensure the state row exists before stamping started_at.
            self._write_state(status=S_RUNNING, run_config=json.dumps(config))
            run_started_at = self._mark_started_now()

            total = self._count_pending(config, run_started_at)
            if total == 0:
                self._write_state(status=S_IDLE)
                raise AgentControlError("No pending records match the current filters")

            self._write_state(
                status=S_RUNNING, total=total,
                processed=0, succeeded=0, failed=0, skipped=0, last_error=None,
            )
            self._spawn(config, run_started_at)
            logger.info("[%s] started (restart=%s, pending=%s, config=%s)",
                        self.agent_id, restart, total, config)
            return self.status()

    def pause(self) -> Dict[str, Any]:
        with self._lock:
            if not self._worker_alive():
                raise AgentControlError("Agent is not running")
            if self._pause_event.is_set():
                raise AgentControlError("Agent is already paused")
            self._pause_event.set()
            self._write_state(status=S_PAUSED)
            return self.status()

    def resume(self) -> Dict[str, Any]:
        with self._lock:
            if self._worker_alive():
                if not self._pause_event.is_set():
                    raise AgentControlError("Agent is already running")
                self._pause_event.clear()
                self._write_state(status=S_RUNNING)
                return self.status()

            # Process restarted: rebuild the worker from persisted state.
            state = self._read_state()
            if state["status"] not in (S_PAUSED, S_STOPPED, S_ERROR):
                raise AgentControlError("Nothing to resume — start the agent instead")
            self._require_ai()

            config = state.get("run_config") or {}
            run_started_at = state.get("started_at")
            if run_started_at is None:
                raise AgentControlError("No previous run found — start the agent instead")
            remaining = self._count_pending(config, run_started_at)
            if remaining == 0:
                self._write_state(status=S_COMPLETED)
                raise AgentControlError("Nothing left to process — run already complete")

            self._write_state(status=S_RUNNING, last_error=None)
            self._spawn(config, run_started_at)
            logger.info("[%s] resumed (%s remaining)", self.agent_id, remaining)
            return self.status()

    def stop(self) -> Dict[str, Any]:
        with self._lock:
            if not self._worker_alive():
                state = self._read_state()
                if state["status"] in (S_RUNNING, S_PAUSED):
                    self._write_state(status=S_STOPPED)
                    return self.status()
                raise AgentControlError("Agent is not running")
            self._stop_event.set()
            self._pause_event.clear()
            return self.status(override_status=S_STOPPED)

    def status(self, override_status: Optional[str] = None) -> Dict[str, Any]:
        state = self._read_state()
        alive = self._worker_alive()
        status = override_status or state["status"]
        if status in (S_RUNNING, S_PAUSED) and not alive and override_status is None:
            status = S_PAUSED  # server restarted mid-run — offer Resume
        remaining = max(0, int(state["total"]) - int(state["processed"]))
        return {
            "agent_id": self.agent_id,
            "status": status,
            "worker_alive": alive,
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
        """Generic report listing; returns None when the DB is unavailable."""
        where = ["agent_id = %s"]
        params: List[Any] = [self.agent_id]
        if status:
            where.append("status = %s")
            params.append(status)
        if since_id is not None:
            where.append("id > %s")
            params.append(since_id)
        where_sql = " AND ".join(where)

        rows = execute_with_connection(
            f"""
            SELECT id, agent_id, entity_type, entity_id, entity_label, status,
                   report, model, error, created_at, updated_at
            FROM agent_reports
            WHERE {where_sql}
            ORDER BY updated_at DESC, id DESC
            LIMIT %s OFFSET %s
            """,
            (*params, limit, offset),
            fetch="all",
            row_factory=dict_row,
        )
        if rows is None:
            return None
        count_row = execute_with_connection(
            f"SELECT COUNT(*) FROM agent_reports WHERE {where_sql}",
            tuple(params),
            fetch="one",
        )
        reports = []
        for r in rows:
            r = dict(r)
            r["created_at"] = r["created_at"].isoformat() if r.get("created_at") else None
            r["updated_at"] = r["updated_at"].isoformat() if r.get("updated_at") else None
            reports.append(r)
        return {
            "reports": reports,
            "total": int(count_row[0]) if count_row else 0,
            "limit": limit,
            "offset": offset,
        }
