import { Listing, ListingUpdate, ListingActivity, Contact } from '../types/listing';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth.token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// ==============================================
// LISTING UPDATE FUNCTIONS
// ==============================================

export const updateListing = async (listingId: number, updateData: ListingUpdate): Promise<Listing> => {
  const response = await fetch(`${API_BASE}/listings/${listingId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData),
  });
  
  return handleResponse(response);
};

export const getListingDetails = async (listingId: number): Promise<Listing> => {
  const response = await fetch(`${API_BASE}/listings/${listingId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};

export const deleteListing = async (listingId: number): Promise<{ message: string; listing_id: number }> => {
  const response = await fetch(`${API_BASE}/listings/${listingId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};

// ==============================================
// ACTIVITY HISTORY FUNCTIONS
// ==============================================

export const calculateListingScore = async (listingId: number): Promise<{
  score: number;
  buyMax: number;
  reasonCodes: string[];
}> => {
  const response = await fetch(`${API_BASE}/listings/${listingId}/score`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};

export const getListingActivities = async (
  listingId: number, 
  limit: number = 50
): Promise<ListingActivity[]> => {
  const response = await fetch(`${API_BASE}/listings/${listingId}/activities?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};

// ==============================================
// CONTACT MANAGEMENT FUNCTIONS
// ==============================================

export const getContacts = async (params?: {
  skip?: number;
  limit?: number;
  contact_type_id?: number;
  assigned_to?: string;
  search?: string;
  is_active?: boolean;
}): Promise<Contact[]> => {
  const searchParams = new URLSearchParams();
  
  if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
  if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
  if (params?.contact_type_id !== undefined) searchParams.append('contact_type_id', params.contact_type_id.toString());
  if (params?.assigned_to) searchParams.append('assigned_to', params.assigned_to);
  if (params?.search) searchParams.append('search', params.search);
  if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
  
  const response = await fetch(`${API_BASE}/crm/contacts?${searchParams}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};

export const createContact = async (contactData: {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company?: string;
  job_title?: string;
  contact_type_id?: number;
  assigned_to?: string;
  address?: Record<string, any>;
  social_profiles?: Record<string, any>;
  preferences?: Record<string, any>;
  notes?: string;
  is_active?: boolean;
}): Promise<Contact> => {
  const response = await fetch(`${API_BASE}/crm/contacts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(contactData),
  });
  
  return handleResponse(response);
};

export const updateContact = async (contactId: string, updateData: Partial<Contact>): Promise<Contact> => {
  const response = await fetch(`${API_BASE}/crm/contacts/${contactId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updateData),
  });
  
  return handleResponse(response);
};

export const deleteContact = async (contactId: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE}/crm/contacts/${contactId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};

// ==============================================
// CONTACT TYPE FUNCTIONS
// ==============================================

export const getContactTypes = async (): Promise<Array<{ id: number; name: string; description?: string }>> => {
  const response = await fetch(`${API_BASE}/crm/contacts/types`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};

// ==============================================
// COMMUNICATION FUNCTIONS (CALLS & SMS)
// ==============================================

export interface CallResponse {
  success: boolean;
  call_sid?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface SMSResponse {
  success: boolean;
  message_sid?: string;
  status?: string;
  message?: string;
  error?: string;
}

export const initiateCall = async (contactId: string, options?: {
  phone_number?: string;
  twiml?: string;
  url?: string;
}): Promise<CallResponse> => {
  const response = await fetch(`${API_BASE}/crm/communications/calls`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      contact_id: contactId,
      ...options
    }),
  });
  
  return handleResponse(response);
};

export const getCallStatus = async (callSid: string): Promise<{
  success: boolean;
  call_sid?: string;
  status?: string;
  duration?: number;
  to?: string;
  from?: string;
  start_time?: string;
  end_time?: string;
  error?: string;
}> => {
  const response = await fetch(`${API_BASE}/crm/communications/calls/${callSid}/status`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};

export const stopCall = async (callSid: string): Promise<CallResponse> => {
  const response = await fetch(`${API_BASE}/crm/communications/calls/${callSid}/stop`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};

export const sendSMS = async (contactId: string, message: string, phoneNumber?: string): Promise<SMSResponse> => {
  const response = await fetch(`${API_BASE}/crm/communications/sms`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      contact_id: contactId,
      message: message,
      phone_number: phoneNumber
    }),
  });
  
  return handleResponse(response);
};

// ==============================================
// BROWSER VOICE (WebRTC) FUNCTIONS
// ==============================================

export interface VoiceTokenResponse {
  success: boolean;
  token?: string;
  identity?: string;
  error?: string;
}

export const getVoiceToken = async (): Promise<VoiceTokenResponse> => {
  const response = await fetch(`${API_BASE}/crm/communications/voice/token`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  return handleResponse(response);
};
