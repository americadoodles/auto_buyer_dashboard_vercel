export interface Task {
  id: string;
  title: string;
  description?: string;
  owner_user_id?: string;
  assigned_to?: string;
  priority_id?: number;
  status_id?: number;
  due_date?: string;
  due_at?: string;
  completed_at?: string;
  related_lead_id?: string;
  related_contact_id?: string;
  related_deal_id?: string;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Enriched fields from API
  owner_user_name?: string;
  assigned_to_user?: string;
  related_deal_name?: string;
  contact_id?: string;
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

