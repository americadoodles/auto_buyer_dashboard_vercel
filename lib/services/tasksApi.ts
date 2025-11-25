// Tasks API Service
import { apiCall } from './api';
import { Task, TaskPriority, TaskStatus, TaskDashboard } from '../types/task';

// Re-export types for convenience
export type { Task, TaskPriority, TaskStatus, TaskDashboard };

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