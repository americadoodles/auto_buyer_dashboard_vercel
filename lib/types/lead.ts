// Lead-related types and interfaces
import { Listing, Contact } from './listing';
import { User } from './user';

// Types for Lead data
export interface Lead {
  id: string;
  // Foreign key IDs (for updates and relationships)
  listing_id?: number;
  contact_id?: string;
  status_id?: number;
  source_id?: number;
  assigned_to?: string;
  created_by: string;
  // Nested objects (populated from joins)
  listing?: Listing;
  contact?: Contact;
  status?: LeadStatus;
  source?: LeadSource;
  assigned_to_user?: User;
  created_by_user?: User;
  // Lead-specific fields
  vehicle_interest?: Record<string, any>;
  budget_range?: {
    min?: number;
    max?: number;
  };
  notes?: string;
  lead_score: number;
  qualified_at?: string;
  converted_at?: string;
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
  converted_leads: number;
  conversion_rate: number;
}

