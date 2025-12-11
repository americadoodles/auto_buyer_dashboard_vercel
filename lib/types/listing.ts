export type Decision = {
  buyMax: number;
  status: string;
  reasons: string[];
};

export type Listing = {
  id: string;
  vehicle_key: string;
  vin?: string;
  price: number;
  miles: number;
  dom: number;
  year: number;
  make: string;
  model: string;
  location?: string;
  radius: number;
  images?: string[];
  transmission?: string;
  exteriorColor?: string;
  interiorColor?: string;
  fuelType?: string;
  overallRating?: string;
  detailedRatings?: string[] | null;
  condition?: string | null;
  mpg?: string;
  cleanTitle?: boolean;
  paidStatus?: string | null;
  sellerDescription?: string | null;
  sellerName?: string | null;
  sellerJoinedDate?: string | null;
  phoneNumber?: string;
  engine?: string;
  driveType?: string;
  bodyStyle?: string;
  source?: string;
  status?: string;
  reasonCodes: string[];
  buyMax: number;
  trim?: string | null;
  buyer_id?: string;
  buyer_username?: string;
  decision?: Decision;
  created_at?: string;
  notes?: string | null;
  updated_at?: string;
  updated_by?: string | null;
  score?: number;
  mmr?: number | null;
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
  dom?: number;
  location?: string;
  images?: string[];
  mmr?: number;
  overall_rating?: string;
  condition?: string;
  mpg?: string;
  clean_title?: boolean;
  paid_status?: string;
  seller_name?: string;
  phone_number?: string;
  seller_description?: string;
  seller_joined_date?: string;
  detailed_ratings?: string[];
  status?: string;
  score?: number;
  buy_max?: number;
  radius?: number;
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
