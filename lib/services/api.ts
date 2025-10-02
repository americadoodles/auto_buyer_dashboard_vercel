 
import { Listing } from '../types/listing';
import { User, UserSignupRequest, UserLoginRequest, UserConfirmRequest, UserRemoveRequest, TokenResponse, UserUpdateRequest, UserUpdatePasswordRequest } from '../types/user';
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

  private static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (!exp) return true;
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  }

  private static validateToken(): boolean {
    const token = ApiService.getToken();
    if (!token) return false;
    
    if (ApiService.isTokenExpired(token)) {
      ApiService.logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
      return false;
    }
    return true;
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
    // Validate token before making request
    if (!ApiService.validateToken()) {
      return { ...(extra as any) };
    }
    
    const token = ApiService.getToken();
    const base: Record<string, string> = {};
    if (token) base['Authorization'] = `Bearer ${token}`;
    return { ...(extra as any), ...base };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Handle token expiration (401 Unauthorized)
      if (response.status === 401) {
        ApiService.logout();
        // Redirect to auth page if we're in the browser
        if (typeof window !== 'undefined') {
          window.location.href = '/auth';
        }
      }
      
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
    const response = await fetch(`${BACKEND_URL}/roles/`, {
      headers: this.authHeaders(),
    });
    return this.handleResponse<Role[]>(response);
  }

  static async createRole(role: RoleCreate): Promise<Role> {
    const response = await fetch(`${BACKEND_URL}/roles/`, {
      method: 'POST',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(role)
    });
    return this.handleResponse<Role>(response);
  }

  static async updateRole(role: RoleEdit): Promise<boolean> {
    const response = await fetch(`${BACKEND_URL}/roles/`, {
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
    const response = await fetch(`${BACKEND_URL}/users/`, {
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

  static async getUser(userId: string): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/users/${userId}`, {
      headers: this.authHeaders(),
    });
    return this.handleResponse<User>(response);
  }

  static async updateUser(userId: string, request: UserUpdateRequest): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/users/${userId}`, {
      method: 'PUT',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(request)
    });
    return this.handleResponse<User>(response);
  }

  static async updateUserPassword(userId: string, request: UserUpdatePasswordRequest): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/users/${userId}/password`, {
      method: 'PUT',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(request)
    });
    return this.handleResponse<any>(response);
  }

  static async updateMyProfile(request: UserUpdateRequest): Promise<User> {
    const response = await fetch(`${BACKEND_URL}/users/me`, {
      method: 'PUT',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(request)
    });
    return this.handleResponse<User>(response);
  }

  static async updateMyPassword(request: UserUpdatePasswordRequest): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/users/me/password`, {
      method: 'PUT',
      headers: this.authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(request)
    });
    return this.handleResponse<any>(response);
  }

  static async getListings(): Promise<Listing[]> {
    const fullUrl = `${BACKEND_URL}/listings`;
    console.log(`[API] getListings - Base URL: ${BACKEND_URL}`);
    console.log(`[API] getListings - Full endpoint URL: ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        headers: this.authHeaders(),
      });
      
      console.log(`[API] getListings - Response status: ${response.status} ${response.statusText}`);
      
      const data = await this.handleResponse<any>(response);
      console.log(`[API] getListings - Success: received ${Array.isArray(data) ? data.length : 'non-array'} items`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`[API] getListings - Error occurred:`, {
        baseUrl: BACKEND_URL,
        fullUrl: fullUrl,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  static async getBuyerListings(buyerId: string): Promise<Listing[]> {
    const fullUrl = `${BACKEND_URL}/listings/buyer/${buyerId}`;
    console.log(`[API] getBuyerListings - Base URL: ${BACKEND_URL}`);
    console.log(`[API] getBuyerListings - Full endpoint URL: ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        headers: this.authHeaders(),
      });
      
      console.log(`[API] getBuyerListings - Response status: ${response.status} ${response.statusText}`);
      
      const data = await this.handleResponse<any>(response);
      console.log(`[API] getBuyerListings - Success: received ${Array.isArray(data) ? data.length : 'non-array'} items`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`[API] getBuyerListings - Error occurred:`, {
        baseUrl: BACKEND_URL,
        fullUrl: fullUrl,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
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

  static async getKpiMetrics(): Promise<{
    metrics: {
      average_profit_per_unit: number;
      lead_to_purchase_time: number;
      aged_inventory: number;
      total_listings: number;
      active_buyers: number;
      conversion_rate: number;
      average_price: number;
      total_value: number;
      scoring_rate: number;
      average_score: number;
    };
    success: boolean;
    message?: string;
  }> {
    const response = await fetch(`${BACKEND_URL}/kpi`, {
      headers: this.authHeaders(),
    });

    return this.handleResponse<{
      metrics: {
        average_profit_per_unit: number;
        lead_to_purchase_time: number;
        aged_inventory: number;
        total_listings: number;
        active_buyers: number;
        conversion_rate: number;
        average_price: number;
        total_value: number;
        scoring_rate: number;
        average_score: number;
      };
      success: boolean;
      message?: string;
    }>(response);
  }
}
