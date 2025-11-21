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

export interface Deal {
  id: string;
  name: string;
  description: string;
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  lead_id?: string;
  deal_value: number;
  probability: number;
  expected_close_date: string;
  deal_stage?: {
    id: number;
    name: string;
    color: string;
  };
  deal_category?: {
    id: number;
    name: string;
  };
  assigned_to?: {
    id: string;
    username: string;
  };
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

