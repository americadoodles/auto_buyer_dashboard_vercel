// Leads API Service
import { ApiService } from './api';

// Types for Lead data
export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  job_title?: string;
  lead_source_id?: number;
  lead_status_id?: number;
  assigned_to?: string;
  vehicle_interest?: string;
  budget_range?: string;
  location?: string;
  notes?: string;
  lead_score: number;
  is_qualified: boolean;
  qualified_at?: string;
  converted_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LeadStatus {
  id: number;
  name: string;
  description?: string;
  color_code: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface LeadSource {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  subject: string;
  description: string;
  activity_date: string;
  created_by: string;
  created_at: string;
}

export interface LeadSummary {
  status_name: string;
  lead_count: number;
  avg_score: number;
}

export interface LeadConversionMetrics {
  total_leads: number;
  qualified_leads: number;
  converted_leads: number;
  conversion_rate: number;
  qualification_rate: number;
}

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

// Helper function to make API calls
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api'}${endpoint}`, {
    headers: getAuthHeaders(),
    ...options
  });
  return handleResponse<T>(response);
};

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth.token') : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      
      // Handle different error response formats
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData && typeof errorData === 'object') {
        // Handle FastAPI validation errors where detail is an array
        if (errorData.detail && Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.msg) return err.msg;
            if (err.message) return err.message;
            return JSON.stringify(err);
          }).join(', ');
        } else {
          errorMessage = errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData);
        }
      }
    } catch (parseError) {
      console.error('Failed to parse error response:', parseError);
      // If we can't parse the error response, use the default message
    }
    throw new Error(errorMessage);
  }
  
  try {
    return await response.json();
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    throw new Error('Invalid response format from server');
  }
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