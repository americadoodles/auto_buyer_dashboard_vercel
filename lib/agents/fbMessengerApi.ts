// API client for the per-user FB Messenger Agent.
// Backend: api/routes/fb_messenger.py (/api/agents/fb-messenger/*).

import { ApiService } from '../services/api';
import type { ExtensionConnectionInfo } from './fbScraperApi';

export type MessengerAiMode = 'auto' | 'paused';
export type MessengerMessageStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type MessengerMessageSender = 'seller' | 'ai' | 'human';
export type MessengerMessageDirection = 'inbound' | 'outbound';

export interface MessengerThread {
  id: string;
  contact_id: string | null;
  listing_id: number | null;
  fb_thread_id: string;
  seller_name: string;
  seller_profile_url: string | null;
  ai_mode: MessengerAiMode;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MessengerMessage {
  id: string;
  thread_id: string;
  direction: MessengerMessageDirection;
  sender: MessengerMessageSender;
  body: string;
  fb_message_id: string | null;
  status: MessengerMessageStatus;
  error: string | null;
  sent_at: string | null;
  created_at: string | null;
}

export interface FbMessengerStatus {
  agent_id: 'fb-messenger';
  status: 'idle' | 'running';
  worker_alive: boolean;
  thread_count: number;
  unread_count: number;
  sent_today: number;
  failed_today: number;
  received_today: number;
  connection: ExtensionConnectionInfo;
}

export const fbMessengerApi = {
  status: () => ApiService.request<FbMessengerStatus>('/agents/fb-messenger/status'),
  start: () => ApiService.request<FbMessengerStatus>('/agents/fb-messenger/start', { method: 'POST' }),
  stop: () => ApiService.request<FbMessengerStatus>('/agents/fb-messenger/stop', { method: 'POST' }),
  threads: (limit = 50, offset = 0) =>
    ApiService.request<{ threads: MessengerThread[]; total: number }>(
      `/agents/fb-messenger/threads?limit=${limit}&offset=${offset}`,
    ),
  messages: (threadId: string, limit = 100, offset = 0) =>
    ApiService.request<{ messages: MessengerMessage[] }>(
      `/agents/fb-messenger/threads/${encodeURIComponent(threadId)}/messages?limit=${limit}&offset=${offset}`,
    ),
  sendMessage: (threadId: string, body: string) =>
    ApiService.request<MessengerMessage>(
      `/agents/fb-messenger/threads/${encodeURIComponent(threadId)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      },
    ),
  // Listing-initiated: open (or create) the conversation for a vehicle listing
  // and trigger a chat-history scrape; returns the thread.
  openListing: (listingId: string | number) =>
    ApiService.request<MessengerThread>(
      `/agents/fb-messenger/listings/${encodeURIComponent(String(listingId))}/open`,
      { method: 'POST' },
    ),
  // Send a message to a listing's seller (keyed by FB listing id).
  sendListingMessage: (listingId: string | number, body: string) =>
    ApiService.request<MessengerMessage>(
      `/agents/fb-messenger/listings/${encodeURIComponent(String(listingId))}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      },
    ),
  setAiMode: (threadId: string, aiMode: MessengerAiMode) =>
    ApiService.request<MessengerThread>(
      `/agents/fb-messenger/threads/${encodeURIComponent(threadId)}/ai_mode`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_mode: aiMode }),
      },
    ),
};
