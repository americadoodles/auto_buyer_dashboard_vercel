 
import { Listing } from '../types/listing';
import { User, UserSignupRequest, UserLoginRequest, UserConfirmRequest, UserRemoveRequest, TokenResponse } from '../types/user';
import { Role, RoleCreate, RoleEdit } from '../types/role';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api';

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiService {
  private static tokenKey = 'auth.token';

  private static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem(ApiService.tokenKey); } catch { return null; }
  }

  private static setToken(token: string | null) {
    if (typeof window === 'undefined') return;
    try {
      if (token) localStorage.setItem(ApiService.tokenKey, token);
      else localStorage.removeItem(ApiService.tokenKey);
    } catch {}
  }

  static logout() {
    ApiService.setToken(null);
  }

  private static authHeaders(extra?: HeadersInit): HeadersInit {
    const token = ApiService.getToken();
    const base: Record<string, string> = {};
    if (token) base['Authorization'] = `Bearer ${token}`;
    return { ...(extra as any), ...base };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        // If we can't parse the error response, use the default message
      }
      throw new ApiError(errorMessage, response.status);
    }
    return await response.json();
  }

  static async getRoles(): Promise<Role[]> {
    const response = await fetch(`${BACKEND_URL}/roles`, {
      headers: this.authHeaders(),
    });
    return this.handleResponse<Role[]>(response);
  }

  static async createRole(role: RoleCreate): Promise<Role> {
    const response = await fetch(`${BACKEND_URL}/roles`, {
      method: 'POST',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(role)
    });
    return this.handleResponse<Role>(response);
  }

  static async updateRole(role: RoleEdit): Promise<boolean> {
    const response = await fetch(`${BACKEND_URL}/roles`, {
      method: 'PUT',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(role)
    });
    return this.handleResponse<boolean>(response);
  }

  static async deleteRole(roleId: number): Promise<boolean> {
    const response = await fetch(`${BACKEND_URL}/roles/${roleId}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    return this.handleResponse<boolean>(response);
  }

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
    return this.handleResponse<User>(response);
  }

  static async login(request: UserLoginRequest): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    const data = await this.handleResponse<TokenResponse>(response);
    this.setToken(data.access_token);
    return data.user;
  }

  static async me(): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/users/me`, {
      headers: this.authHeaders(),
    });
    return this.handleResponse<User>(response);
  }

  static async getSignupRequests(): Promise<UserSignupRequest[]> {
    const response = await fetch(`${BACKEND_URL}/users/signup-requests`, {
      headers: this.authHeaders(),
    });
    return this.handleResponse<UserSignupRequest[]>(response);
  }

  static async getUsers(): Promise<User[]> {
    const response = await fetch(`${BACKEND_URL}/users`, {
      headers: this.authHeaders(),
    });
    return this.handleResponse<User[]>(response);
  }

  static async confirmSignup(request: UserConfirmRequest): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/users/confirm-signup`, {
      method: 'POST',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(request)
    });
    return this.handleResponse<any>(response);
  }

  static async removeUser(request: UserRemoveRequest): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/users/remove-user`, {
      method: 'POST',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(request)
    });
    return this.handleResponse<any>(response);
  }

  static async getListings(): Promise<Listing[]> {
    const response = await fetch(`${BACKEND_URL}/listings`, {
      headers: this.authHeaders(),
    });
    const data = await this.handleResponse<any>(response);
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
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });

    return this.handleResponse<Array<{
      vehicle_key: string;
      vin: string;
      score: number;
      buyMax: number;
      reasonCodes: string[];
    }>>(response);
  }

  static async ingestListings(listings: Listing[]): Promise<Listing[]> {
    const response = await fetch(`${BACKEND_URL}/ingest`, {
      method: 'POST',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(listings)
    });

    return this.handleResponse<Listing[]>(response);
  }

  static async notifyListing(vehicle_key: string, vin: string): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/notify`, {
      method: 'POST',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify([{ vehicle_key, vin }])
    });

    return this.handleResponse<any>(response);
  }
}
