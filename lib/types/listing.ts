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
  location: string;
  buyer_id: string;
  buyer_username?: string;
  created_at?: string;
  decision?: Decision;
};

export type SortConfig = {
  key: keyof Listing | 'decision_status' | 'decision_reasons';
  dir: 'asc' | 'desc';
};

export type BackendStatus = boolean | null;
