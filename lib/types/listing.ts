export type Decision = {
  buyMax: number;
  status: string;
  reasons: string[];
};

export type Listing = {
  id: string;
  vehicle_key: string;
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  miles: number;
  price: number;
  score: number;
  dom: number;
  source: string;
  radius: number;
  reasonCodes: string[];
  buyMax: number;
  status?: string;
  location: string;
  buyer_id: string;
  buyer_username?: string;
  created_at?: string;
  decision?: Decision;
  // New editable fields
  notes?: string;
  condition_rating?: number;
  interior_color?: string;
  exterior_color?: string;
  transmission?: string;
  fuel_type?: string;
  drivetrain?: string;
  engine_size?: string;
  body_style?: string;
  updated_at?: string;
  updated_by?: string;
  images?: string[];
  mmr?: number;
};

export type SortConfig = {
  key: keyof Listing | 'decision_status' | 'decision_reasons';
  dir: 'asc' | 'desc';
};

export type BackendStatus = boolean | null;

// New types for listing management
export type ListingUpdate = {
  vin?: string;
  notes?: string;
  condition_rating?: number;
  interior_color?: string;
  exterior_color?: string;
  transmission?: string;
  fuel_type?: string;
  drivetrain?: string;
  engine_size?: string;
  body_style?: string;
  price?: number;
  miles?: number;
  location?: string;
  images?: string[];
  mmr?: number;
};

export type ListingActivity = {
  id: number;
  listing_id: number;
  activity_type: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description?: string;
  created_at: string;
  created_by?: string;
};

export type Contact = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company?: string;
  job_title?: string;
  contact_type_id?: number;
  contact_type?: {
    id: number;
    name: string;
    color?: string;
  };
  assigned_to?: string;
  address?: Record<string, any>;
  social_profiles?: Record<string, any>;
  preferences?: Record<string, any>;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
