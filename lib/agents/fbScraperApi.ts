// API client for the per-user FB Marketplace Scraper Agent.
// Backend: api/routes/fb_scraper.py (/api/agents/fb-scraper/*).

import { ApiService } from '../services/api';
import type { AgentStatus } from './agentControl';

export interface FbScraperFilters {
  location?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  minYear?: number | string;
  maxYear?: number | string;
  minMileage?: number | string;
  maxMileage?: number | string;
  radius?: number | string;
  startTime?: number | string;
  endTime?: number | string;
  maxListings?: number | string;
  exact?: boolean;
  // Populated when the user picks a candidate from the typeahead. The
  // extension uses these to set buyLocation in the FB GraphQL variables;
  // without them, FB falls back to a default region.
  latitude?: number;
  longitude?: number;
  selectedLocation?: LocationCandidate;
}

export interface ExtensionConnectionInfo {
  connected: boolean;
  connected_at?: number;
  last_pong_at?: number;
  extension_version?: string | null;
  fb_logged_in?: boolean | null;
  captured_template_names?: string[];
}

export interface FbScraperStatus extends AgentStatus {
  connection?: ExtensionConnectionInfo;
}

export interface LocationCandidate {
  single_line_address: string;
  subtitle: string;
  multi_line_address: string[];
  latitude: number | null;
  longitude: number | null;
  page_id: string | null;
}

export const fbScraperApi = {
  status: () => ApiService.request<FbScraperStatus>('/agents/fb-scraper/status'),
  start: (filters: FbScraperFilters) =>
    ApiService.request<FbScraperStatus>('/agents/fb-scraper/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters }),
    }),
  stop: () =>
    ApiService.request<FbScraperStatus>('/agents/fb-scraper/stop', { method: 'POST' }),
  refreshTemplates: () =>
    ApiService.request<FbScraperStatus>('/agents/fb-scraper/refresh_templates', {
      method: 'POST',
    }),
  locationTypeahead: (query: string) =>
    ApiService.request<{ candidates: LocationCandidate[] }>(
      '/agents/fb-scraper/location/typeahead',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      },
    ),
};
