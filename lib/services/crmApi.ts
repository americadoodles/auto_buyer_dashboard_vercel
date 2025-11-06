// CRM API Service
import { ApiService } from './api';

// Types for CRM data
export interface CRMStats {
  total_leads: number;
  qualified_leads: number;
  total_contacts: number;
  active_deals: number;
  won_deals: number;
  lost_deals: number;
  total_revenue: number;
  pending_tasks: number;
  overdue_tasks: number;
}

export interface LeadConversionMetrics {
  leads_created: number;
  leads_contacted: number;
  leads_qualified: number;
  leads_converted: number;
  conversion_rate: number;
  avg_time_to_contact?: number;
  avg_time_to_qualify?: number;
  avg_time_to_convert?: number;
}

export interface SalesPerformanceMetrics {
  deals_created: number;
  deals_won: number;
  deals_lost: number;
  win_rate: number;
  total_revenue: number;
  avg_deal_size: number;
  avg_sales_cycle?: number;
  revenue_by_stage: Record<string, number>;
}

export interface RecentActivity {
  id: string;
  type: 'lead' | 'deal' | 'task';
  activity_type: string;
  subject: string;
  description: string;
  activity_date: string;
  entity_name: string;
  user_name: string;
}

export interface UpcomingTask {
  id: string;
  title: string;
  due_date: string | null;
  priority_name: string;
  priority_color: string;
  status_name: string;
  status_color: string;
  assigned_to_name: string;
  created_at: string;
}

export interface DealForecast {
  id: string;
  name: string;
  deal_value: number;
  probability: number;
  expected_close_date: string;
  stage_name: string;
  contact_name: string;
  assigned_to_name: string;
}

export interface HighScoringVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  score: number;
  price: number;
  miles: number;
  location: string;
}

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

// CRM Dashboard API functions
export const crmApi = {
  // Dashboard stats
  async getDashboardStats(): Promise<CRMStats> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api'}/crm/dashboard/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse<CRMStats>(response);
  },

  async getLeadConversionMetrics(): Promise<LeadConversionMetrics> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api'}/crm/dashboard/lead-metrics`, {
      headers: getAuthHeaders()
    });
    return handleResponse<LeadConversionMetrics>(response);
  },

  async getSalesPerformanceMetrics(): Promise<SalesPerformanceMetrics> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api'}/crm/dashboard/sales-metrics`, {
      headers: getAuthHeaders()
    });
    return handleResponse<SalesPerformanceMetrics>(response);
  },

  async getRecentActivities(): Promise<RecentActivity[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api'}/crm/dashboard/recent-activities`, {
      headers: getAuthHeaders()
    });
    return handleResponse<RecentActivity[]>(response);
  },

  async getUpcomingTasks(): Promise<UpcomingTask[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api'}/crm/dashboard/upcoming-tasks`, {
      headers: getAuthHeaders()
    });
    return handleResponse<UpcomingTask[]>(response);
  },

  async getDealForecast(): Promise<DealForecast[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api'}/crm/dashboard/deal-forecast`, {
      headers: getAuthHeaders()
    });
    return handleResponse<DealForecast[]>(response);
  },

  // High scoring vehicles (mock data for now - can be replaced with real API)
  async getHighScoringVehicles(): Promise<HighScoringVehicle[]> {
    // This would be replaced with a real API call when the feature is implemented
    return [
      {
        id: '1',
        make: 'Honda',
        model: 'Civic',
        year: 2023,
        trim: 'EX',
        score: 95,
        price: 25000,
        miles: 15000,
        location: 'Los Angeles, CA'
      },
      {
        id: '2',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        trim: 'LE',
        score: 92,
        price: 28000,
        miles: 22000,
        location: 'San Francisco, CA'
      },
      {
        id: '3',
        make: 'BMW',
        model: '3 Series',
        year: 2023,
        trim: '330i',
        score: 88,
        price: 45000,
        miles: 8000,
        location: 'New York, NY'
      }
    ];
  }
};
