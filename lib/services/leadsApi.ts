// Leads API Service
import { ApiService } from './api';
import type {
  Lead,
  LeadStatus,
  LeadSource,
  LeadActivity,
  LeadSummary,
  LeadConversionMetrics
} from '../types/lead';

// Helper function to build query parameters
const buildQueryParams = (params: Record<string, any>): string => {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });
  return queryParams.toString();
};

// Helper function to make API calls using unified ApiService
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  return ApiService.request<T>(endpoint, options);
};

// Leads API functions
export const leadsApi = {
  // Lead management
  async getLeads(params?: {
    skip?: number;
    limit?: number;
    status_id?: number;
    assigned_to?: string;
    search?: string;
  }): Promise<Lead[]> {
    const queryString = params ? buildQueryParams(params) : '';
    const endpoint = `/crm/leads${queryString ? '?' + queryString : ''}`;
    return apiCall<Lead[]>(endpoint);
  },

  async getLead(id: string): Promise<Lead> {
    return apiCall<Lead>(`/crm/leads/${id}`);
  },

  async createLead(lead: Partial<Lead>): Promise<Lead> {
    return apiCall<Lead>('/crm/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
  },

  async updateLead(id: string, lead: Partial<Lead>): Promise<Lead> {
    return apiCall<Lead>(`/crm/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
  },

  async deleteLead(id: string): Promise<void> {
    await apiCall(`/crm/leads/${id}`, { method: 'DELETE' });
  },

  // Lead statuses
  async getLeadStatuses(): Promise<LeadStatus[]> {
    return apiCall<LeadStatus[]>('/crm/leads/statuses');
  },

  async createLeadStatus(status: Partial<LeadStatus>): Promise<LeadStatus> {
    return apiCall<LeadStatus>('/crm/leads/statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(status)
    });
  },

  async updateLeadStatus(id: number, status: Partial<LeadStatus>): Promise<LeadStatus> {
    return apiCall<LeadStatus>(`/crm/leads/statuses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(status)
    });
  },

  async deleteLeadStatus(id: number): Promise<void> {
    await apiCall(`/crm/leads/statuses/${id}`, { method: 'DELETE' });
  },

  // Lead sources
  async getLeadSources(): Promise<LeadSource[]> {
    return apiCall<LeadSource[]>('/crm/leads/sources');
  },

  async createLeadSource(source: Partial<LeadSource>): Promise<LeadSource> {
    return apiCall<LeadSource>('/crm/leads/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source)
    });
  },

  async updateLeadSource(id: number, source: Partial<LeadSource>): Promise<LeadSource> {
    return apiCall<LeadSource>(`/crm/leads/sources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source)
    });
  },

  async deleteLeadSource(id: number): Promise<void> {
    await apiCall(`/crm/leads/sources/${id}`, { method: 'DELETE' });
  },

  // Lead activities
  async getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    return apiCall<LeadActivity[]>(`/crm/leads/${leadId}/activities`);
  },

  async createLeadActivity(leadId: string, activity: Partial<LeadActivity>): Promise<LeadActivity> {
    return apiCall<LeadActivity>(`/crm/leads/${leadId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity)
    });
  },

  // Analytics
  async getLeadSummary(): Promise<LeadSummary[]> {
    return apiCall<LeadSummary[]>('/crm/leads/summary');
  },

  async getLeadMetrics(): Promise<LeadConversionMetrics> {
    return apiCall<LeadConversionMetrics>('/crm/leads/metrics');
  }
};