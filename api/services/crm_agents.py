# CRM Agents — concrete agent implementations on top of CrmAgentRunner.
#
#   lead-scoring     : scores unconverted leads 0-100 with reasoning
#   deal-risk        : flags open deals at risk of stalling / being lost
#   followup-drafter : drafts a follow-up for contacts ghosting our last
#                      outbound message (> FOLLOWUP_QUIET_DAYS)
#   task-generator   : proposes tasks for stale leads/deals with no open task
#
# All agents are REPORT-ONLY: results land in agent_reports, nothing writes
# to CRM tables.

from typing import Any, Dict, Optional
from datetime import datetime
import logging

from psycopg.rows import dict_row

from ..core.db_helpers import execute_with_connection
from . import crm_agent_service
from .crm_agent_runner import CrmAgentRunner, AgentSkipItem, _date_filter, _exclusion

logger = logging.getLogger(__name__)

FOLLOWUP_QUIET_DAYS = 3   # outbound message unanswered for this long → follow up
STALE_DAYS = 7            # lead/deal untouched for this long → needs a task

_CONTENT_PREVIEW = 300    # chars of message content passed to the AI


def _contact_name(row: Dict[str, Any]) -> str:
    name = " ".join(filter(None, [row.get("first_name"), row.get("last_name")])).strip()
    return name or "unknown contact"


# --------------------------------------------------------------------------- #
# 1. Lead Scoring Agent
# --------------------------------------------------------------------------- #

class LeadScoringAgent(CrmAgentRunner):
    agent_id = "lead-scoring"

    _BASE_FROM = """
        FROM leads l
        LEFT JOIN contacts c       ON c.id  = l.contact_id
        LEFT JOIN listings li      ON li.id = l.listing_id
        LEFT JOIN lead_statuses ls ON ls.id = l.status_id
        LEFT JOIN lead_sources src ON src.id = l.source_id
    """
    _BASE_WHERE = "l.converted_at IS NULL"  # converted leads need no score

    def _pending_where(self, config: Dict[str, Any]):
        date_sql, date_params = _date_filter("l", config)
        where = (
            f"{self._BASE_WHERE} AND "
            + _exclusion(self.agent_id, "'lead'", "l.id::text")
            + date_sql
        )
        return where, date_params

    def _count_pending(self, config: Dict[str, Any], run_started_at: datetime) -> int:
        where, date_params = self._pending_where(config)
        row = execute_with_connection(
            f"SELECT COUNT(*) FROM leads l WHERE {where}",
            (self.agent_id, run_started_at, *date_params),
            fetch="one",
        )
        return int(row[0]) if row else 0

    def _next_item(self, config: Dict[str, Any], run_started_at: datetime) -> Optional[Dict[str, Any]]:
        where, date_params = self._pending_where(config)
        row = execute_with_connection(
            f"""
            SELECT l.id::text AS lead_id, l.vehicle_interest, l.budget_range,
                   l.notes, l.lead_score AS current_score,
                   l.created_at AS lead_created_at, l.qualified_at,
                   ls.name AS status, src.name AS source,
                   c.first_name, c.last_name, c.email, c.phone, c.mobile,
                   c.fb_seller_rating, c.fb_verified,
                   li.year, li.make, li.model, li.price, li.miles,
                   li.vehicle_condition,
                   GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(li.fb_creation_time, li.created_at))) / 86400))::int AS dom,
                   (SELECT COUNT(*) FROM communications cm
                     WHERE cm.to_lead_id = l.id) AS communications_count
            {self._BASE_FROM}
            WHERE {where}
            ORDER BY l.created_at ASC, l.id ASC
            LIMIT 1
            """,
            (self.agent_id, run_started_at, *date_params),
            fetch="one",
            row_factory=dict_row,
        )
        if row is None:
            return None
        r = dict(row)
        vehicle = " ".join(str(v) for v in (r.get("year"), r.get("make"), r.get("model")) if v)
        label = f"{_contact_name(r)} · {vehicle or r.get('vehicle_interest') or 'no vehicle info'}"
        return {
            "entity_type": "lead",
            "entity_id": r["lead_id"],
            "entity_label": label,
            "context": {
                "contact": _contact_name(r),
                "contact_email": r.get("email"),
                "contact_phone": r.get("phone") or r.get("mobile"),
                "fb_seller_rating": r.get("fb_seller_rating"),
                "fb_verified": r.get("fb_verified"),
                "vehicle_interest": r.get("vehicle_interest"),
                "linked_listing": vehicle or None,
                "listing_price": r.get("price"),
                "listing_miles": r.get("miles"),
                "listing_condition": r.get("vehicle_condition"),
                "listing_days_on_market": r.get("dom"),
                "budget_range": r.get("budget_range"),
                "lead_status": r.get("status"),
                "lead_source": r.get("source"),
                "current_lead_score": r.get("current_score"),
                "qualified": bool(r.get("qualified_at")),
                "lead_created_at": str(r.get("lead_created_at") or ""),
                "communications_count": r.get("communications_count"),
                "notes": (r.get("notes") or "")[:500] or None,
            },
        }

    def _process(self, item: Dict[str, Any]) -> Dict[str, Any]:
        ctx = item["context"]
        # Nothing to score: no contact, no vehicle, no notes — skip, don't guess.
        if not any(ctx.get(k) for k in ("vehicle_interest", "linked_listing", "notes", "budget_range")):
            raise AgentSkipItem("lead has no scoreable data (no vehicle, budget or notes)")
        return crm_agent_service.score_lead(ctx)


# --------------------------------------------------------------------------- #
# 2. Deal Risk Agent
# --------------------------------------------------------------------------- #

class DealRiskAgent(CrmAgentRunner):
    agent_id = "deal-risk"

    _BASE_WHERE = (
        "NOT COALESCE(d.is_won, false) AND NOT COALESCE(d.is_lost, false) "
        "AND NOT COALESCE(d.is_hidden, false)"
    )

    def _pending_where(self, config: Dict[str, Any]):
        date_sql, date_params = _date_filter("d", config)
        where = (
            f"{self._BASE_WHERE} AND "
            + _exclusion(self.agent_id, "'deal'", "d.id::text")
            + date_sql
        )
        return where, date_params

    def _count_pending(self, config: Dict[str, Any], run_started_at: datetime) -> int:
        where, date_params = self._pending_where(config)
        row = execute_with_connection(
            f"SELECT COUNT(*) FROM deals d WHERE {where}",
            (self.agent_id, run_started_at, *date_params),
            fetch="one",
        )
        return int(row[0]) if row else 0

    def _next_item(self, config: Dict[str, Any], run_started_at: datetime) -> Optional[Dict[str, Any]]:
        where, date_params = self._pending_where(config)
        row = execute_with_connection(
            f"""
            SELECT d.id::text AS deal_id, d.name, d.description, d.deal_value,
                   d.probability, d.expected_close_date, d.notes,
                   d.vehicle_requirements, d.created_at AS deal_created_at,
                   d.updated_at AS deal_updated_at,
                   st.name AS stage, st.probability AS stage_probability,
                   c.first_name, c.last_name,
                   EXTRACT(day FROM now() - d.updated_at)::int AS days_since_update,
                   (d.expected_close_date - CURRENT_DATE) AS days_to_expected_close,
                   (SELECT COUNT(*) FROM tasks t
                     WHERE t.related_deal_id = d.id AND t.completed_at IS NULL) AS open_tasks,
                   (SELECT MAX(cm.created_at) FROM communications cm
                     WHERE cm.to_contact_id = d.contact_id) AS last_communication_at
            FROM deals d
            LEFT JOIN deal_stages st ON st.id = d.deal_stage_id
            LEFT JOIN contacts c     ON c.id  = d.contact_id
            WHERE {where}
            ORDER BY d.created_at ASC, d.id ASC
            LIMIT 1
            """,
            (self.agent_id, run_started_at, *date_params),
            fetch="one",
            row_factory=dict_row,
        )
        if row is None:
            return None
        r = dict(row)
        return {
            "entity_type": "deal",
            "entity_id": r["deal_id"],
            "entity_label": f"{r.get('name') or 'unnamed deal'} · {_contact_name(r)}",
            "context": {
                "deal_name": r.get("name"),
                "description": (r.get("description") or "")[:400] or None,
                "stage": r.get("stage"),
                "stage_default_probability_pct": r.get("stage_probability"),
                "deal_probability_pct": r.get("probability"),
                "deal_value": float(r["deal_value"]) if r.get("deal_value") is not None else None,
                "expected_close_date": str(r.get("expected_close_date") or "") or None,
                "days_to_expected_close": r.get("days_to_expected_close"),
                "days_since_last_update": r.get("days_since_update"),
                "open_tasks": r.get("open_tasks"),
                "last_communication_at": str(r.get("last_communication_at") or "") or None,
                "seller_contact": _contact_name(r),
                "vehicle_requirements": (str(r.get("vehicle_requirements") or ""))[:400] or None,
                "notes": (r.get("notes") or "")[:500] or None,
                "deal_created_at": str(r.get("deal_created_at") or ""),
            },
        }

    def _process(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return crm_agent_service.assess_deal_risk(item["context"])


# --------------------------------------------------------------------------- #
# 3. Follow-up Drafter Agent
# --------------------------------------------------------------------------- #

class FollowupDrafterAgent(CrmAgentRunner):
    agent_id = "followup-drafter"

    # Contacts whose LAST message is ours (outbound) and has sat unanswered.
    _BASE_WHERE = f"""
        COALESCE(ct.is_active, true)
        AND EXISTS (SELECT 1 FROM communications cm WHERE cm.to_contact_id = ct.id)
        AND (SELECT cm.direction FROM communications cm
              WHERE cm.to_contact_id = ct.id
              ORDER BY cm.created_at DESC LIMIT 1) = 'outbound'
        AND (SELECT MAX(cm.created_at) FROM communications cm
              WHERE cm.to_contact_id = ct.id) < now() - interval '{FOLLOWUP_QUIET_DAYS} days'
    """

    def _pending_where(self, config: Dict[str, Any]):
        date_sql, date_params = _date_filter("ct", config)
        where = (
            f"{self._BASE_WHERE} AND "
            + _exclusion(self.agent_id, "'contact'", "ct.id::text")
            + date_sql
        )
        return where, date_params

    def _count_pending(self, config: Dict[str, Any], run_started_at: datetime) -> int:
        where, date_params = self._pending_where(config)
        row = execute_with_connection(
            f"SELECT COUNT(*) FROM contacts ct WHERE {where}",
            (self.agent_id, run_started_at, *date_params),
            fetch="one",
        )
        return int(row[0]) if row else 0

    def _next_item(self, config: Dict[str, Any], run_started_at: datetime) -> Optional[Dict[str, Any]]:
        where, date_params = self._pending_where(config)
        row = execute_with_connection(
            f"""
            SELECT ct.id::text AS contact_id, ct.first_name, ct.last_name,
                   ct.email, ct.phone, ct.mobile, ct.notes,
                   (SELECT l.vehicle_interest FROM leads l
                     WHERE l.contact_id = ct.id
                     ORDER BY l.created_at DESC LIMIT 1) AS vehicle_interest,
                   (SELECT CONCAT_WS(' ', li.year::text, li.make, li.model)
                      FROM leads l JOIN listings li ON li.id = l.listing_id
                     WHERE l.contact_id = ct.id
                     ORDER BY l.created_at DESC LIMIT 1) AS linked_vehicle
            FROM contacts ct
            WHERE {where}
            ORDER BY ct.created_at ASC, ct.id ASC
            LIMIT 1
            """,
            (self.agent_id, run_started_at, *date_params),
            fetch="one",
            row_factory=dict_row,
        )
        if row is None:
            return None
        r = dict(row)

        history = execute_with_connection(
            """
            SELECT communication_type, direction, subject, content, created_at
            FROM communications
            WHERE to_contact_id = %s::uuid
            ORDER BY created_at DESC
            LIMIT 5
            """,
            (r["contact_id"],),
            fetch="all",
            row_factory=dict_row,
        ) or []
        thread = [
            f"[{h['created_at']:%Y-%m-%d}] {h['direction']} {h['communication_type']}: "
            f"{(h.get('subject') or '')} {(h.get('content') or '')[:_CONTENT_PREVIEW]}".strip()
            for h in reversed(list(history))
        ]
        days_quiet = None
        if history:
            newest = max(h["created_at"] for h in history)
            days_quiet = (datetime.now(newest.tzinfo) - newest).days

        vehicle = r.get("linked_vehicle") or r.get("vehicle_interest")
        return {
            "entity_type": "contact",
            "entity_id": r["contact_id"],
            "entity_label": f"{_contact_name(r)} · {vehicle or 'no vehicle linked'}",
            "context": {
                "seller_name": _contact_name(r),
                "vehicle": vehicle,
                "days_since_our_last_message": days_quiet,
                "has_email": bool(r.get("email")),
                "has_phone": bool(r.get("phone") or r.get("mobile")),
                "contact_notes": (r.get("notes") or "")[:300] or None,
                "recent_thread_oldest_first": thread,
            },
        }

    def _process(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return crm_agent_service.draft_followup(item["context"])


# --------------------------------------------------------------------------- #
# 4. Task Generator Agent
# --------------------------------------------------------------------------- #

class TaskGeneratorAgent(CrmAgentRunner):
    agent_id = "task-generator"

    # Stale leads and deals with no open task, oldest-stale first.
    def _candidates_sql(self, config: Dict[str, Any]):
        lead_date_sql, lead_params = _date_filter("l", config)
        deal_date_sql, deal_params = _date_filter("d", config)
        sql = f"""
            SELECT 'lead' AS entity_type, l.id::text AS entity_id, l.updated_at
            FROM leads l
            WHERE l.converted_at IS NULL
              AND l.updated_at < now() - interval '{STALE_DAYS} days'
              AND NOT EXISTS (SELECT 1 FROM tasks t
                               WHERE t.related_lead_id = l.id AND t.completed_at IS NULL)
              AND {_exclusion(self.agent_id, "'lead'", "l.id::text")}
              {lead_date_sql}
            UNION ALL
            SELECT 'deal', d.id::text, d.updated_at
            FROM deals d
            WHERE NOT COALESCE(d.is_won, false) AND NOT COALESCE(d.is_lost, false)
              AND NOT COALESCE(d.is_hidden, false)
              AND d.updated_at < now() - interval '{STALE_DAYS} days'
              AND NOT EXISTS (SELECT 1 FROM tasks t
                               WHERE t.related_deal_id = d.id AND t.completed_at IS NULL)
              AND {_exclusion(self.agent_id, "'deal'", "d.id::text")}
              {deal_date_sql}
        """
        params = (self.agent_id, None, *lead_params, self.agent_id, None, *deal_params)
        return sql, params

    def _bind_started(self, params, run_started_at: datetime):
        # Replace the two None placeholders with the run start timestamp.
        return tuple(run_started_at if p is None else p for p in params)

    def _count_pending(self, config: Dict[str, Any], run_started_at: datetime) -> int:
        sql, params = self._candidates_sql(config)
        row = execute_with_connection(
            f"SELECT COUNT(*) FROM ({sql}) cand",
            self._bind_started(params, run_started_at),
            fetch="one",
        )
        return int(row[0]) if row else 0

    def _next_item(self, config: Dict[str, Any], run_started_at: datetime) -> Optional[Dict[str, Any]]:
        sql, params = self._candidates_sql(config)
        row = execute_with_connection(
            f"SELECT * FROM ({sql}) cand ORDER BY updated_at ASC LIMIT 1",
            self._bind_started(params, run_started_at),
            fetch="one",
            row_factory=dict_row,
        )
        if row is None:
            return None
        if row["entity_type"] == "lead":
            return self._lead_item(row["entity_id"])
        return self._deal_item(row["entity_id"])

    def _lead_item(self, lead_id: str) -> Dict[str, Any]:
        r = dict(execute_with_connection(
            """
            SELECT l.vehicle_interest, l.budget_range, l.notes,
                   l.updated_at, ls.name AS status,
                   c.first_name, c.last_name,
                   EXTRACT(day FROM now() - l.updated_at)::int AS days_stale
            FROM leads l
            LEFT JOIN contacts c       ON c.id  = l.contact_id
            LEFT JOIN lead_statuses ls ON ls.id = l.status_id
            WHERE l.id = %s::uuid
            """,
            (lead_id,), fetch="one", row_factory=dict_row,
        ) or {})
        return {
            "entity_type": "lead",
            "entity_id": lead_id,
            "entity_label": f"Lead · {_contact_name(r)} · {r.get('vehicle_interest') or 'no vehicle'}",
            "context": {
                "record_type": "lead",
                "seller_contact": _contact_name(r),
                "vehicle_interest": r.get("vehicle_interest"),
                "budget_range": r.get("budget_range"),
                "lead_status": r.get("status"),
                "days_without_activity": r.get("days_stale"),
                "notes": (r.get("notes") or "")[:400] or None,
            },
        }

    def _deal_item(self, deal_id: str) -> Dict[str, Any]:
        r = dict(execute_with_connection(
            """
            SELECT d.name, d.deal_value, d.expected_close_date, d.notes,
                   st.name AS stage, c.first_name, c.last_name,
                   EXTRACT(day FROM now() - d.updated_at)::int AS days_stale
            FROM deals d
            LEFT JOIN deal_stages st ON st.id = d.deal_stage_id
            LEFT JOIN contacts c     ON c.id  = d.contact_id
            WHERE d.id = %s::uuid
            """,
            (deal_id,), fetch="one", row_factory=dict_row,
        ) or {})
        return {
            "entity_type": "deal",
            "entity_id": deal_id,
            "entity_label": f"Deal · {r.get('name') or 'unnamed'} · {_contact_name(r)}",
            "context": {
                "record_type": "deal",
                "deal_name": r.get("name"),
                "stage": r.get("stage"),
                "deal_value": float(r["deal_value"]) if r.get("deal_value") is not None else None,
                "expected_close_date": str(r.get("expected_close_date") or "") or None,
                "seller_contact": _contact_name(r),
                "days_without_activity": r.get("days_stale"),
                "notes": (r.get("notes") or "")[:400] or None,
            },
        }

    def _process(self, item: Dict[str, Any]) -> Dict[str, Any]:
        return crm_agent_service.generate_tasks(item["context"])


# Module-level singletons — shared via the agents registry.
lead_scoring_agent = LeadScoringAgent()
deal_risk_agent = DealRiskAgent()
followup_drafter_agent = FollowupDrafterAgent()
task_generator_agent = TaskGeneratorAgent()
