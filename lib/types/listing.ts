export type Listing = {
  id: string;
  vehicle_key: string;
  vin: string;
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
};

export type SortConfig = {
  key: keyof Listing;
  dir: 'asc' | 'desc';
};

export type BackendStatus = boolean | null;
