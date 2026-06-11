// Damage Detection Agent — types + API client.
// Backend: FastAPI routes under /api/agents/damage/* (see api/routes/damage_agent.py).

import { ApiService } from '../services/api';

export type DamageAgentRunStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'error';

export interface DamageAgentRunConfig {
  date_from: string | null; // YYYY-MM-DD, inclusive (listing ingested date)
  date_to: string | null;   // YYYY-MM-DD, inclusive
}

export interface DamageAgentStatus {
  agent_id: string;
  status: DamageAgentRunStatus;
  worker_alive: boolean;
  cursor_listing_id: number | null;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;          // analyzed but out of scope (not passenger / light commercial)
  remaining: number;
  progress_pct: number;
  run_config: DamageAgentRunConfig | null;
  last_error: string | null;
  started_at: string | null;
  updated_at: string | null;
}

export interface DamageItem {
  part: string;
  damage_type: string;
  severity: 'minor' | 'moderate' | 'severe';
  location: string | null;
  description: string | null;
  image_index: number | null;
  confidence: number;
  estimated_repair_cost_usd: { low: number; high: number } | null;
}

export type VehicleCategory =
  | 'passenger'
  | 'light_commercial'
  | 'heavy_commercial'
  | 'motorcycle'
  | 'rv_camper'
  | 'bus'
  | 'equipment'
  | 'trailer'
  | 'boat'
  | 'other';

export interface DamageReportPayload {
  vehicle_category: VehicleCategory;
  in_scope: boolean; // true only for passenger / light_commercial
  vehicle_identified: string | null;
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  damage_detected: boolean;
  damage_count: number;
  damages: DamageItem[];
  clean_panels: string[];
  image_quality_issues: string[];
  total_estimated_repair_cost_usd: { low: number; high: number } | null;
  summary: string | null;
}

export interface DamageReport {
  id: number;
  listing_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  report: DamageReportPayload | null;
  model: string | null;
  images_analyzed: number;
  error: string | null;
  created_at: string | null;
  updated_at: string | null;
  // joined listing context
  vin: string | null;
  year: number | null;
  make: string | null;
  vehicle_model: string | null;
  trim: string | null;
  price: number | null;
  images: string[] | null;
}

export interface DamageReportsPage {
  reports: DamageReport[];
  total: number;
  limit: number;
  offset: number;
}

const BASE = '/agents/damage';

export interface StartOptions {
  restart?: boolean;
  dateFrom?: string | null; // YYYY-MM-DD
  dateTo?: string | null;   // YYYY-MM-DD
}

export const damageAgentApi = {
  start: (opts: StartOptions = {}) =>
    ApiService.request<DamageAgentStatus>(`${BASE}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restart: opts.restart ?? false,
        date_from: opts.dateFrom || null,
        date_to: opts.dateTo || null,
      }),
    }),
  pause: () => ApiService.request<DamageAgentStatus>(`${BASE}/pause`, { method: 'POST' }),
  resume: () => ApiService.request<DamageAgentStatus>(`${BASE}/resume`, { method: 'POST' }),
  stop: () => ApiService.request<DamageAgentStatus>(`${BASE}/stop`, { method: 'POST' }),
  status: () => ApiService.request<DamageAgentStatus>(`${BASE}/status`),
  reports: (params: { sinceId?: number; listingId?: number; status?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.sinceId !== undefined) qs.set('since_id', String(params.sinceId));
    if (params.listingId !== undefined) qs.set('listing_id', String(params.listingId));
    if (params.status) qs.set('status', params.status);
    qs.set('limit', String(params.limit ?? 50));
    qs.set('offset', String(params.offset ?? 0));
    return ApiService.request<DamageReportsPage>(`${BASE}/reports?${qs.toString()}`);
  },
};
