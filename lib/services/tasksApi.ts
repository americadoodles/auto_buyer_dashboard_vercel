// Tasks API Service
import { ApiService } from './api';

// Types for Task data
export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  priority_id?: number;
  status_id?: number;
  due_date?: string;
  completed_at?: string;
  related_lead_id?: string;
  related_contact_id?: string;
  related_deal_id?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskPriority {
  id: number;
  name: string;
  description?: string;
  color_code: string;
  sort_order: number;
  created_at: string;
}

export interface TaskStatus {
  id: number;
  name: string;
  description?: string;
  color_code: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface TaskDashboard {
  id: string;
  title: string;
  due_date?: string;
  priority_name: string;
  priority_color: string;
  status_name: string;
  status_color: string;
  assigned_to_name: string;
  created_at: string;
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

// Helper function to make API calls using unified ApiService
const apiCall = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  return ApiService.request<T>(endpoint, options);
};
// Tasks API functions
export const tasksApi = {
  // Task management
  async getTasks(params?: {
    skip?: number;
    limit?: number;
    assigned_to?: string;
    priority_id?: number;
    status_id?: number;
    due_date_from?: string;
    due_date_to?: string;
    related_lead_id?: string;
    related_contact_id?: string;
    related_deal_id?: string;
    search?: string;
  }): Promise<Task[]> {
    const queryString = params ? buildQueryParams(params) : '';
    const endpoint = `/crm/tasks/${queryString ? '?' + queryString : ''}`;
    return apiCall<Task[]>(endpoint);
  },

  async getTask(id: string): Promise<Task> {
    return apiCall<Task>(`/crm/tasks/${id}`);
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    return apiCall<Task>('/crm/tasks/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
  },

  async updateTask(id: string, task: Partial<Task>): Promise<Task> {
    return apiCall<Task>(`/crm/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
  },

  async deleteTask(id: string): Promise<void> {
    await apiCall(`/crm/tasks/${id}`, { method: 'DELETE' });
  },

  async completeTask(id: string): Promise<void> {
    await apiCall(`/crm/tasks/${id}/complete`, { method: 'PATCH' });
  },

  // My tasks
  async getMyTasks(): Promise<Task[]> {
    return apiCall<Task[]>('/crm/tasks/my-tasks');
  },

  // Task dashboard
  async getTaskDashboard(): Promise<TaskDashboard[]> {
    return apiCall<TaskDashboard[]>('/crm/tasks/dashboard');
  },

  // Task priorities
  async getTaskPriorities(): Promise<TaskPriority[]> {
    return apiCall<TaskPriority[]>('/crm/tasks/priorities/');
  },

  async createTaskPriority(priority: Partial<TaskPriority>): Promise<TaskPriority> {
    return apiCall<TaskPriority>('/crm/tasks/priorities/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(priority)
    });
  },

  async updateTaskPriority(id: number, priority: Partial<TaskPriority>): Promise<TaskPriority> {
    return apiCall<TaskPriority>(`/crm/tasks/priorities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(priority)
    });
  },

  async deleteTaskPriority(id: number): Promise<void> {
    await apiCall(`/crm/tasks/priorities/${id}`, { method: 'DELETE' });
  },

  // Task statuses
  async getTaskStatuses(): Promise<TaskStatus[]> {
    return apiCall<TaskStatus[]>('/crm/tasks/statuses/');
  },

  async createTaskStatus(status: Partial<TaskStatus>): Promise<TaskStatus> {
    return apiCall<TaskStatus>('/crm/tasks/statuses/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(status)
    });
  },

  async updateTaskStatus(id: number, status: Partial<TaskStatus>): Promise<TaskStatus> {
    return apiCall<TaskStatus>(`/crm/tasks/statuses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(status)
    });
  },

  async deleteTaskStatus(id: number): Promise<void> {
    await apiCall(`/crm/tasks/statuses/${id}`, { method: 'DELETE' });
  }
};