# AI Agents Registry
#
# Single source of truth mapping agent_id -> runner singleton. All runners
# expose the same control API: start(restart, date_from, date_to), pause(),
# resume(), stop(), status(), reports(status, since_id, limit, offset).

from typing import Dict

from .damage_agent_runner import damage_agent
from .crm_agents import (
    lead_scoring_agent,
    deal_risk_agent,
    followup_drafter_agent,
    task_generator_agent,
)

AGENTS: Dict[str, object] = {
    runner.agent_id: runner
    for runner in (
        damage_agent,
        lead_scoring_agent,
        deal_risk_agent,
        followup_drafter_agent,
        task_generator_agent,
    )
}


def get_agent(agent_id: str):
    """Return the runner for agent_id, or None when unknown."""
    return AGENTS.get(agent_id)
