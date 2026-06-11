// Generic AI agent control — types + API client.
// Backend: FastAPI routes under /api/agents/{agent_id}/* (api/routes/agents_control.py).
// All agents (damage-detection + CRM agents) share this one client.

import { ApiService } from '../services/api';

export type AgentRunStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'error';

export type AgentReportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface AgentRunConfig {
  date_from: string | null; // YYYY-MM-DD, inclusive (entity created date)
  date_to: string | null;   // YYYY-MM-DD, inclusive
}

export interface AgentStatus {
  agent_id: string;
  status: AgentRunStatus;
  worker_alive: boolean;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  remaining: number;
  progress_pct: number;
  run_config: AgentRunConfig | null;
  last_error: string | null;
  started_at: string | null;
  updated_at: string | null;
  // damage agent extra (absent for CRM agents)
  cursor_listing_id?: number | null;
}

/** Generic report row; `report` payload shape differs per agent. */
export interface AgentReport {
  id: number;
  agent_id: string;
  entity_type: string;          // 'listing' | 'lead' | 'deal' | 'contact'
  entity_id: string;
  entity_label: string | null;  // human-readable label for UI/console
  status: AgentReportStatus;
  report: Record<string, unknown> | null;
  model: string | null;
  error: string | null;
  created_at: string | null;
  updated_at: string | null;
  // damage agent extras (absent for CRM agents)
  images_analyzed?: number;
  vin?: string | null;
  price?: number | null;
}

export interface AgentReportsPage {
  reports: AgentReport[];
  total: number;
  limit: number;
  offset: number;
}

export interface StartOptions {
  restart?: boolean;
  dateFrom?: string | null; // YYYY-MM-DD
  dateTo?: string | null;   // YYYY-MM-DD
}

export interface ReportsQuery {
  sinceId?: number;
  status?: AgentReportStatus;
  limit?: number;
  offset?: number;
}

/** API client bound to one agent id. */
export function agentApi(agentId: string) {
  const base = `/agents/${encodeURIComponent(agentId)}`;
  return {
    start: (opts: StartOptions = {}) =>
      ApiService.request<AgentStatus>(`${base}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restart: opts.restart ?? false,
          date_from: opts.dateFrom || null,
          date_to: opts.dateTo || null,
        }),
      }),
    pause: () => ApiService.request<AgentStatus>(`${base}/pause`, { method: 'POST' }),
    resume: () => ApiService.request<AgentStatus>(`${base}/resume`, { method: 'POST' }),
    stop: () => ApiService.request<AgentStatus>(`${base}/stop`, { method: 'POST' }),
    status: () => ApiService.request<AgentStatus>(`${base}/status`),
    reports: (q: ReportsQuery = {}) => {
      const qs = new URLSearchParams();
      if (q.sinceId !== undefined) qs.set('since_id', String(q.sinceId));
      if (q.status) qs.set('status', q.status);
      qs.set('limit', String(q.limit ?? 50));
      qs.set('offset', String(q.offset ?? 0));
      return ApiService.request<AgentReportsPage>(`${base}/reports?${qs.toString()}`);
    },
  };
}

export type AgentApi = ReturnType<typeof agentApi>;
