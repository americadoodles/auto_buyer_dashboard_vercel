# CRM Agent AI Service
#
# AI analysis functions for the CRM agents (lead scoring, deal risk,
# follow-up drafting, task generation). Pure service layer — callers supply
# pre-fetched entity context dicts; persistence lives in the agent runner.
#
# All functions are REPORT-ONLY: they return structured JSON and never write
# to CRM tables.

from typing import Any, Dict, List, Optional
import json
import logging

from openai import OpenAI

from ..core.config import settings

logger = logging.getLogger(__name__)

CRM_MODEL = "gpt-4o-mini"

RISK_LEVELS = {"low", "medium", "high", "critical"}
TASK_PRIORITIES = {"low", "medium", "high", "urgent"}
FOLLOWUP_CHANNELS = {"sms", "email"}


def _get_client() -> OpenAI:
    if not settings.AI_ENABLED or not settings.OPENAI_API_KEY:
        raise ValueError("OpenAI API key not configured")
    try:
        return OpenAI(api_key=settings.OPENAI_API_KEY)
    except Exception as e:
        logger.error("Error initializing OpenAI client: %s", e)
        raise ValueError(f"Failed to initialize OpenAI client: {e}")


def _json_completion(system: str, prompt: str, max_tokens: int = 800) -> Dict[str, Any]:
    """One JSON-mode completion with clean, single-line error surfaces."""
    client = _get_client()
    try:
        response = client.chat.completions.create(
            model=CRM_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=max_tokens,
        )
    except Exception as e:
        raise ValueError(f"AI call failed: {e}")

    content = response.choices[0].message.content
    if not content:
        raise ValueError("AI returned empty response")
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse AI response as JSON: %.300s", content)
        raise ValueError(f"Failed to parse AI response: {e}")


def _clamp_int(value: Any, lo: int, hi: int, default: int) -> int:
    try:
        return max(lo, min(hi, int(value)))
    except (TypeError, ValueError):
        return default


def _str_list(value: Any, max_items: int = 10) -> List[str]:
    if not isinstance(value, list):
        return []
    return [str(v).strip() for v in value if v][:max_items]


def _fmt_context(ctx: Dict[str, Any]) -> str:
    """Render an entity context dict as readable key: value lines."""
    lines = []
    for k, v in ctx.items():
        if v is None or v == "" or v == []:
            continue
        lines.append(f"{k}: {v}")
    return "\n".join(lines) or "(no data)"


# --------------------------------------------------------------------------- #
# 1. Deal Risk
# --------------------------------------------------------------------------- #
#
# (Lead Scoring used to live here as an LLM prompt. It's now a deterministic
# rubric — see lead_scoring_rules.py — since every point value and hard
# "deal killer" block must be exact and auditable.)

def assess_deal_risk(ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Assess an open deal's risk of stalling or being lost."""
    prompt = f"""You are assessing the health of an open vehicle-purchase deal
(we are the buyer; the contact is the seller).

Deal data:
{_fmt_context(ctx)}

Consider: days since last update vs expected close date, stage vs probability,
missing close date / value, open-task coverage, communication recency, and any
notes signals. Flag concrete risks only — do not invent facts.

Respond with EXACTLY this JSON shape:
{{
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_score": 0-100,
  "risk_factors": ["1-6 short factual risk factors"],
  "positive_signals": ["factors that derisk the deal, if any"],
  "recommended_actions": ["1-4 concrete next steps, most urgent first"],
  "summary": "1-2 sentence assessment"
}}"""

    raw = _json_completion(
        "You are an expert automotive deal-desk risk analyst. "
        "Always respond with a single valid JSON object and nothing else.",
        prompt,
    )
    level = str(raw.get("risk_level", "")).lower()
    risk_score = _clamp_int(raw.get("risk_score"), 0, 100, 50)
    if level not in RISK_LEVELS:
        level = "critical" if risk_score >= 85 else "high" if risk_score >= 60 else "medium" if risk_score >= 35 else "low"
    return {
        "risk_level": level,
        "risk_score": risk_score,
        "risk_factors": _str_list(raw.get("risk_factors")),
        "positive_signals": _str_list(raw.get("positive_signals")),
        "recommended_actions": _str_list(raw.get("recommended_actions"), max_items=4),
        "summary": (str(raw["summary"]).strip() if raw.get("summary") else None),
    }


# --------------------------------------------------------------------------- #
# 2. Follow-up Drafter
# --------------------------------------------------------------------------- #

def draft_followup(ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Draft a follow-up message for a contact whose thread has gone quiet.

    REPORT-ONLY: the draft is stored in the report; nothing is sent.
    """
    prompt = f"""You are drafting a follow-up message to a private vehicle seller
who has not replied to our last outbound message. We want to buy their vehicle.

Context:
{_fmt_context(ctx)}

Write a short, casual, personalized follow-up. Reference the specific vehicle
when known. No pressure tactics, no invented offers or prices, no placeholder
brackets — the message must be ready to send as-is.

Respond with EXACTLY this JSON shape:
{{
  "channel": "sms" | "email",
  "subject": "email subject, or null for sms",
  "draft": "the message text (sms: max ~300 chars)",
  "tone": "short label, e.g. 'casual', 'friendly-professional'",
  "rationale": "1 sentence on the approach chosen"
}}"""

    raw = _json_completion(
        "You are an expert automotive outreach copywriter. "
        "Always respond with a single valid JSON object and nothing else.",
        prompt,
        max_tokens=500,
    )
    channel = str(raw.get("channel", "")).lower()
    if channel not in FOLLOWUP_CHANNELS:
        channel = "sms"
    draft = (str(raw["draft"]).strip() if raw.get("draft") else None)
    if not draft:
        raise ValueError("AI returned an empty draft")
    return {
        "channel": channel,
        "subject": (str(raw["subject"]).strip() if raw.get("subject") and channel == "email" else None),
        "draft": draft,
        "tone": (str(raw["tone"]).strip() if raw.get("tone") else None),
        "rationale": (str(raw["rationale"]).strip() if raw.get("rationale") else None),
    }


# --------------------------------------------------------------------------- #
# 3. Task Generator
# --------------------------------------------------------------------------- #

def generate_tasks(ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Propose follow-up tasks for a stale lead/deal with no open tasks.

    REPORT-ONLY: proposed tasks live in the report; none are created.
    """
    prompt = f"""You are proposing follow-up tasks for a stale CRM record that has
no open tasks (we buy vehicles; the contact is the seller).

Record data:
{_fmt_context(ctx)}

Propose 1-3 concrete, non-overlapping tasks that would move this record forward.
Each task must be actionable by a buyer today — no vague "check in" filler.

Respond with EXACTLY this JSON shape:
{{
  "tasks": [
    {{
      "title": "imperative, max ~70 chars",
      "description": "1-2 sentences with the specifics",
      "priority": "low" | "medium" | "high" | "urgent",
      "due_in_days": 1,
      "rationale": "why this task, 1 sentence"
    }}
  ],
  "summary": "1 sentence on the overall situation"
}}"""

    raw = _json_completion(
        "You are an expert CRM operations planner for an auto buying team. "
        "Always respond with a single valid JSON object and nothing else.",
        prompt,
    )
    tasks = []
    for t in (raw.get("tasks") or [])[:3]:
        if not isinstance(t, dict) or not t.get("title"):
            continue
        priority = str(t.get("priority", "")).lower()
        tasks.append({
            "title": str(t["title"]).strip()[:120],
            "description": (str(t["description"]).strip() if t.get("description") else None),
            "priority": priority if priority in TASK_PRIORITIES else "medium",
            "due_in_days": _clamp_int(t.get("due_in_days"), 0, 60, 3),
            "rationale": (str(t["rationale"]).strip() if t.get("rationale") else None),
        })
    if not tasks:
        raise ValueError("AI returned no usable tasks")
    return {
        "tasks": tasks,
        "task_count": len(tasks),
        "summary": (str(raw["summary"]).strip() if raw.get("summary") else None),
    }
