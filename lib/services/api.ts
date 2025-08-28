import { Listing } from '../types/listing';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api';

export class ApiService {
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/healthz`);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async getListings(): Promise<Listing[]> {
    const response = await fetch(`${BACKEND_URL}/listings`);
    if (!response.ok) {
      throw new Error('Failed to fetch listings');
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  static async scoreListings(listings: Listing[]): Promise<Array<{
    vin: string;
    score: number;
    buyMax: number;
    reasonCodes: string[];
  }>> {
    const payload = listings.map(listing => ({
      vin: listing.vin,
      price: listing.price,
      miles: listing.miles,
      dom: listing.dom,
      source: listing.source
    }));

    const response = await fetch(`${BACKEND_URL}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Failed to score listings');
    }

    return await response.json();
  }

  static async ingestListings(listings: Listing[]): Promise<Listing[]> {
    const response = await fetch(`${BACKEND_URL}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listings)
    });

    if (!response.ok) {
      throw new Error('Failed to ingest listings');
    }

    return await response.json();
  }

  static async notifyListing(vin: string): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ vin }])
    });

    if (!response.ok) {
      throw new Error('Failed to notify listing');
    }

    return await response.json();
  }
}
