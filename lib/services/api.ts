import { Listing } from '../types/listing';
import { User, UserSignupRequest, UserLoginRequest, UserConfirmRequest, UserRemoveRequest } from '../types/user';

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

  static async signup(request: UserSignupRequest): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error('Signup failed');
    return await response.json();
  }

  static async login(request: UserLoginRequest): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error('Login failed');
    return await response.json();
  }

  static async getSignupRequests(): Promise<UserSignupRequest[]> {
    const response = await fetch(`${BACKEND_URL}/users/signup-requests`);
    if (!response.ok) throw new Error('Failed to fetch signup requests');
    return await response.json();
  }

  static async confirmSignup(request: UserConfirmRequest): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/users/confirm-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error('Failed to confirm signup');
    return await response.json();
  }

  static async removeUser(request: UserRemoveRequest): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/users/remove-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw new Error('Failed to remove user');
    return await response.json();
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
    vehicle_key: string;
    vin: string;
    score: number;
    buyMax: number;
    reasonCodes: string[];
  }>> {
    const payload = listings.map(listing => ({
      vehicle_key: listing.vehicle_key,
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

  static async notifyListing(vehicle_key: string, vin: string): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ vehicle_key, vin }])
    });

    if (!response.ok) {
      throw new Error('Failed to notify listing');
    }

    return await response.json();
  }
}
