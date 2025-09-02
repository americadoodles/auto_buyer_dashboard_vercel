 
import { Listing } from '../types/listing';
import { User, UserSignupRequest, UserLoginRequest, UserConfirmRequest, UserRemoveRequest } from '../types/user';
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
    const response = await fetch(`${BACKEND_URL}/roles`);
    return this.handleResponse<Role[]>(response);
  }

  static async createRole(role: RoleCreate): Promise<Role> {
    const response = await fetch(`${BACKEND_URL}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role)
    });
    return this.handleResponse<Role>(response);
  }

  static async updateRole(role: RoleEdit): Promise<boolean> {
    const response = await fetch(`${BACKEND_URL}/roles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role)
    });
    return this.handleResponse<boolean>(response);
  }

  static async deleteRole(roleId: number): Promise<boolean> {
    const response = await fetch(`${BACKEND_URL}/roles/${roleId}`, {
      method: 'DELETE'
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
    return this.handleResponse<User>(response);
  }

  static async getSignupRequests(): Promise<UserSignupRequest[]> {
    const response = await fetch(`${BACKEND_URL}/users/signup-requests`);
    return this.handleResponse<UserSignupRequest[]>(response);
  }

  static async getUsers(): Promise<User[]> {
    const response = await fetch(`${BACKEND_URL}/users`);
    return this.handleResponse<User[]>(response);
  }

  static async confirmSignup(request: UserConfirmRequest): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/users/confirm-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return this.handleResponse<any>(response);
  }

  static async removeUser(request: UserRemoveRequest): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/users/remove-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    return this.handleResponse<any>(response);
  }

  static async getListings(): Promise<Listing[]> {
    const response = await fetch(`${BACKEND_URL}/listings`);
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listings)
    });

    return this.handleResponse<Listing[]>(response);
  }

  static async notifyListing(vehicle_key: string, vin: string): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ vehicle_key, vin }])
    });

    return this.handleResponse<any>(response);
  }
}
