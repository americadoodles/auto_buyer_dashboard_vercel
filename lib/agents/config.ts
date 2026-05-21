// Editable agent configuration shape consumed by the Agent Builder.
// In v1 this lives in-memory; the editor's Save calls /api/agents/[id]/config
// which currently just echoes back (the file-backed persistence will be added
// when the Python service exposes a real endpoint).

import type { AgentDomain } from './data';

export interface AgentTool {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface AgentLimits {
  dailyBudgetUsd: number;
  contextTokenCap: number;
  concurrency: number;
  timeoutSec: number;
}

export interface AgentHitlRules {
  /** Pause and request human approval when LQI is at or above this value. */
  approvalLqiAbove: number;
  /** Pause when the value (deal size, payout, refund) crosses this dollar amount. */
  approvalDealAbove: number;
  /** Always require approval when model confidence drops below this. */
  requireApprovalIfConfidenceBelow: number;
  /** Auto-pause the agent when consecutive errors exceed this. */
  autoPauseOnErrors: number;
}

export interface AgentConfig {
  id: number;
  name: string;
  domain: AgentDomain;
  model: string;
  enabled: boolean;
  systemPrompt: string;
  userPromptTemplate: string;
  tools: AgentTool[];
  limits: AgentLimits;
  hitl: AgentHitlRules;
}

export const MODEL_OPTIONS: { id: string; label: string; tier: 'fast' | 'balanced' | 'powerful' }[] = [
  { id: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5',  tier: 'fast'      },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'balanced'  },
  { id: 'claude-opus-4-7',   label: 'Claude Opus 4.7',   tier: 'powerful'  },
];

const COMMON_TOOLS: AgentTool[] = [
  { id: 'crm_read',        label: 'CRM: Read records',        description: 'Read leads, contacts, deals',           enabled: true  },
  { id: 'crm_write',       label: 'CRM: Write records',       description: 'Create/update leads, deals, tasks',     enabled: false },
  { id: 'send_sms',        label: 'Communication: Send SMS',  description: 'Twilio outbound SMS',                   enabled: false },
  { id: 'send_email',      label: 'Communication: Send Email',description: 'Outbound email via Sendgrid',           enabled: false },
  { id: 'marketplace_fetch',label:'Marketplace: Fetch listing',description:'Pull live listing from FB/Craigslist',  enabled: false },
  { id: 'mmr_lookup',      label: 'Vehicle: MMR lookup',      description: 'Manheim Market Report price band',      enabled: false },
  { id: 'carfax_lookup',   label: 'Vehicle: Carfax history',  description: 'Carfax VIN history pull',               enabled: false },
  { id: 'route_to_agent',  label: 'Workflow: Route to agent', description: 'Hand off task to another agent',        enabled: true  },
  { id: 'escalate_human',  label: 'Workflow: Escalate human', description: 'Page senior buyer / ops on Slack',      enabled: true  },
];

function cloneTools(enabledIds: string[]): AgentTool[] {
  return COMMON_TOOLS.map((t) => ({ ...t, enabled: enabledIds.includes(t.id) }));
}

// Seed config per known agent. Defaults are intentionally conservative for HITL
// thresholds — buyers can loosen them once they trust the model output.
export const AGENT_CONFIGS: Record<number, AgentConfig> = {
  1: {
    id: 1, name: 'Lead Triage', domain: 'CRM', model: 'claude-sonnet-4-6', enabled: true,
    systemPrompt: 'You are the Lead Triage agent. Route incoming qualified leads to the dealer with the best inventory match. Optimize for: response time, inventory fit, and dealer capacity.',
    userPromptTemplate: 'Lead: {{lead_summary}}\nAvailable dealers: {{dealers_json}}\nReturn the dealer id and a 1-line justification.',
    tools: cloneTools(['crm_read', 'crm_write', 'route_to_agent', 'escalate_human']),
    limits: { dailyBudgetUsd: 10, contextTokenCap: 500_000, concurrency: 4, timeoutSec: 30 },
    hitl: { approvalLqiAbove: 0, approvalDealAbove: 0, requireApprovalIfConfidenceBelow: 70, autoPauseOnErrors: 5 },
  },
  2: {
    id: 2, name: 'Communication', domain: 'CRM', model: 'claude-sonnet-4-6', enabled: true,
    systemPrompt: 'You are the Communication agent. Draft SMS and email replies to leads. Tone defaults to casual + warm; mirror the seller\'s register. Never quote a final price without escalation.',
    userPromptTemplate: 'Thread so far: {{thread}}\nLead intent: {{intent}}\nDraft the next outbound message.',
    tools: cloneTools(['crm_read', 'send_sms', 'send_email', 'route_to_agent']),
    limits: { dailyBudgetUsd: 20, contextTokenCap: 800_000, concurrency: 8, timeoutSec: 30 },
    hitl: { approvalLqiAbove: 0, approvalDealAbove: 0, requireApprovalIfConfidenceBelow: 75, autoPauseOnErrors: 3 },
  },
  3: {
    id: 3, name: 'Deal Intelligence', domain: 'CRM', model: 'claude-opus-4-7', enabled: true,
    systemPrompt: 'You are the Deal Intelligence agent. Compose 3-tier offers (aggressive, fair, ceiling) for active negotiations. Use MMR + Carfax + condition photos as evidence.',
    userPromptTemplate: 'Deal: {{deal}}\nMMR band: {{mmr}}\nCarfax flags: {{carfax}}\nReturn JSON with three offers and a one-paragraph rationale each.',
    tools: cloneTools(['crm_read', 'crm_write', 'mmr_lookup', 'carfax_lookup', 'escalate_human']),
    limits: { dailyBudgetUsd: 8, contextTokenCap: 300_000, concurrency: 3, timeoutSec: 45 },
    hitl: { approvalLqiAbove: 0, approvalDealAbove: 25000, requireApprovalIfConfidenceBelow: 80, autoPauseOnErrors: 2 },
  },
  4: {
    id: 4, name: 'Pipeline Mgmt', domain: 'CRM', model: 'claude-sonnet-4-6', enabled: true,
    systemPrompt: 'You are the Pipeline Mgmt agent. Watch for stale deals, missed SLAs, and stuck handoffs. Nudge the responsible agent first; escalate to a human after 72 hours.',
    userPromptTemplate: 'Pipeline snapshot: {{snapshot}}\nReturn list of nudges + escalations with reason.',
    tools: cloneTools(['crm_read', 'crm_write', 'route_to_agent', 'escalate_human']),
    limits: { dailyBudgetUsd: 10, contextTokenCap: 400_000, concurrency: 4, timeoutSec: 30 },
    hitl: { approvalLqiAbove: 0, approvalDealAbove: 0, requireApprovalIfConfidenceBelow: 70, autoPauseOnErrors: 5 },
  },
  5: {
    id: 5, name: 'Discovery Agent', domain: 'Marketplace', model: 'claude-haiku-4-5', enabled: true,
    systemPrompt: 'You are the Discovery agent. Scan marketplaces for vehicles matching the buyer rules. Always pre-filter on price band, mileage, and known scam patterns before forwarding.',
    userPromptTemplate: 'Marketplace: {{marketplace}}\nSearch rules: {{rules}}\nReturn the raw listings array.',
    tools: cloneTools(['marketplace_fetch', 'route_to_agent']),
    limits: { dailyBudgetUsd: 25, contextTokenCap: 1_000_000, concurrency: 12, timeoutSec: 20 },
    hitl: { approvalLqiAbove: 0, approvalDealAbove: 0, requireApprovalIfConfidenceBelow: 60, autoPauseOnErrors: 10 },
  },
  6: {
    id: 6, name: 'Vehicle Intelligence', domain: 'Marketplace', model: 'claude-sonnet-4-6', enabled: true,
    systemPrompt: 'You are the Vehicle Intelligence agent. Score each candidate listing on a 0–100 LQI scale using MMR delta, Carfax flags, mileage curve, and photo quality.',
    userPromptTemplate: 'Listing: {{listing}}\nMMR: {{mmr}}\nCarfax: {{carfax}}\nReturn {lqi, reasons, recommended_action}.',
    tools: cloneTools(['marketplace_fetch', 'mmr_lookup', 'carfax_lookup', 'route_to_agent']),
    limits: { dailyBudgetUsd: 15, contextTokenCap: 500_000, concurrency: 6, timeoutSec: 30 },
    hitl: { approvalLqiAbove: 0, approvalDealAbove: 0, requireApprovalIfConfidenceBelow: 70, autoPauseOnErrors: 5 },
  },
  7: {
    id: 7, name: 'Lead Qualification', domain: 'Marketplace', model: 'claude-sonnet-4-6', enabled: true,
    systemPrompt: 'You are the Lead Qualification agent. Read the seller listing copy + reply history. Tag intent (motivated, exploring, locked-in) and compute a final LQI before handing to CRM.',
    userPromptTemplate: 'Listing: {{listing}}\nThread: {{thread}}\nReturn {intent, lqi, notes}.',
    tools: cloneTools(['crm_read', 'crm_write', 'route_to_agent']),
    limits: { dailyBudgetUsd: 15, contextTokenCap: 600_000, concurrency: 8, timeoutSec: 30 },
    hitl: { approvalLqiAbove: 95, approvalDealAbove: 0, requireApprovalIfConfidenceBelow: 75, autoPauseOnErrors: 5 },
  },
  8: {
    id: 8, name: 'Dealer Onboarding', domain: 'Admin', model: 'claude-haiku-4-5', enabled: true,
    systemPrompt: 'You are the Dealer Onboarding agent. Verify DMV license, run OCR on uploaded docs, and flag missing/mismatched fields for human review.',
    userPromptTemplate: 'Application: {{application}}\nDocs: {{docs}}\nReturn {verified: bool, missing_fields, ocr_summary}.',
    tools: cloneTools(['crm_read', 'crm_write', 'escalate_human']),
    limits: { dailyBudgetUsd: 5, contextTokenCap: 200_000, concurrency: 2, timeoutSec: 60 },
    hitl: { approvalLqiAbove: 0, approvalDealAbove: 0, requireApprovalIfConfidenceBelow: 90, autoPauseOnErrors: 3 },
  },
  9: {
    id: 9, name: 'Compliance Monitor', domain: 'Admin', model: 'claude-opus-4-7', enabled: true,
    systemPrompt: 'You are the Compliance Monitor. Run OFAC + AML checks on all new applications. Always escalate any potential match — never auto-clear.',
    userPromptTemplate: 'Application: {{application}}\nReturn {ofac_hits, aml_hits, recommendation}.',
    tools: cloneTools(['crm_read', 'escalate_human']),
    limits: { dailyBudgetUsd: 8, contextTokenCap: 300_000, concurrency: 4, timeoutSec: 45 },
    hitl: { approvalLqiAbove: 0, approvalDealAbove: 0, requireApprovalIfConfidenceBelow: 99, autoPauseOnErrors: 1 },
  },
  10: {
    id: 10, name: 'Financial Ops', domain: 'Admin', model: 'claude-sonnet-4-6', enabled: false,
    systemPrompt: 'You are the Financial Ops agent. Reconcile Stripe webhooks against internal ledger. Block any transaction with a >$10 discrepancy until human review.',
    userPromptTemplate: 'Webhook: {{webhook}}\nLedger: {{ledger}}\nReturn {reconciled, gap, action}.',
    tools: cloneTools(['crm_read', 'crm_write', 'escalate_human']),
    limits: { dailyBudgetUsd: 6, contextTokenCap: 250_000, concurrency: 2, timeoutSec: 45 },
    hitl: { approvalLqiAbove: 0, approvalDealAbove: 0, requireApprovalIfConfidenceBelow: 95, autoPauseOnErrors: 1 },
  },
};

export function getAgentConfig(id: number): AgentConfig | undefined {
  return AGENT_CONFIGS[id];
}
