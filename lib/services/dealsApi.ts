// Deals API Service
import { ApiService } from './api';

// Types for Deal data
export interface Deal {
  id: string;
  title: string;
  description?: string;
  contact_id?: string;
  assigned_to?: string;
  deal_stage_id?: number;
  deal_category_id?: number;
  expected_close_date?: string;
  actual_close_date?: string;
  deal_value?: number;
  probability?: number;
  notes?: string;
  is_active: boolean;
  is_won?: boolean;
  is_lost?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DealStage {
  id: number;
  name: string;
  description?: string;
  color_code: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface DealCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface DealActivity {
  id: string;
  deal_id: string;
  activity_type: string;
  subject: string;
  description: string;
  activity_date: string;
  created_by: string;
  created_at: string;
}

export interface DealPipeline {
  stage_id: number;
  stage_name: string;
  color_code: string;
  deal_count: number;
  total_value: number;
  avg_probability: number;
}

export interface SalesPerformanceMetrics {
  total_deals: number;
  active_deals: number;
  closed_deals: number;
  won_deals: number;
  total_value: number;
  won_value: number;
  avg_deal_size: number;
  win_rate: number;
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

// Helper function to make API calls
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api'}${endpoint}`, {
    headers: getAuthHeaders(),
    ...options
  });
  return handleResponse<T>(response);
};

// Deals API functions
export const dealsApi = {
  // Deal management
  async getDeals(params?: {
    skip?: number;
    limit?: number;
    stage_id?: number;
    category_id?: number;
    assigned_to?: string;
    contact_id?: string;
    search?: string;
    is_won?: boolean;
    is_lost?: boolean;
  }): Promise<Deal[]> {
    const queryString = params ? buildQueryParams(params) : '';
    const endpoint = `/crm/deals${queryString ? '?' + queryString : ''}`;
    return apiCall<Deal[]>(endpoint);
  },

  async getDeal(id: string): Promise<Deal> {
    return apiCall<Deal>(`/crm/deals/${id}`);
  },

  async createDeal(deal: Partial<Deal>): Promise<Deal> {
    return apiCall<Deal>('/crm/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deal)
    });
  },

  async updateDeal(id: string, deal: Partial<Deal>): Promise<Deal> {
    return apiCall<Deal>(`/crm/deals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deal)
    });
  },

  async deleteDeal(id: string): Promise<void> {
    await apiCall(`/crm/deals/${id}`, { method: 'DELETE' });
  },

  // Deal stages
  async getDealStages(): Promise<DealStage[]> {
    return apiCall<DealStage[]>('/crm/deals/stages');
  },

  async createDealStage(stage: Partial<DealStage>): Promise<DealStage> {
    return apiCall<DealStage>('/crm/deals/stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stage)
    });
  },

  async updateDealStage(id: number, stage: Partial<DealStage>): Promise<DealStage> {
    return apiCall<DealStage>(`/crm/deals/stages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stage)
    });
  },

  async deleteDealStage(id: number): Promise<void> {
    await apiCall(`/crm/deals/stages/${id}`, { method: 'DELETE' });
  },

  // Deal categories
  async getDealCategories(): Promise<DealCategory[]> {
    return apiCall<DealCategory[]>('/crm/deals/categories');
  },

  async createDealCategory(category: Partial<DealCategory>): Promise<DealCategory> {
    return apiCall<DealCategory>('/crm/deals/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category)
    });
  },

  async updateDealCategory(id: number, category: Partial<DealCategory>): Promise<DealCategory> {
    return apiCall<DealCategory>(`/crm/deals/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category)
    });
  },

  async deleteDealCategory(id: number): Promise<void> {
    await apiCall(`/crm/deals/categories/${id}`, { method: 'DELETE' });
  },

  // Deal activities
  async getDealActivities(dealId: string): Promise<DealActivity[]> {
    return apiCall<DealActivity[]>(`/crm/deals/${dealId}/activities`);
  },

  async createDealActivity(dealId: string, activity: Partial<DealActivity>): Promise<DealActivity> {
    return apiCall<DealActivity>(`/crm/deals/${dealId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity)
    });
  },

  // Analytics
  async getDealPipeline(): Promise<DealPipeline[]> {
    return apiCall<DealPipeline[]>('/crm/deals/pipeline');
  },

  async getSalesMetrics(): Promise<SalesPerformanceMetrics> {
    return apiCall<SalesPerformanceMetrics>('/crm/deals/metrics');
  }
};