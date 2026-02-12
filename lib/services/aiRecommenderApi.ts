import { ApiService } from './api';

export interface AskRequest {
  question: string;
  k?: number; // default 5
}

export interface AskResponse {
  answer: string;
  sources: any[];
  question: string;
}

export interface RecommendRequest {
  vin: string;
}

export interface RecommendResponse {
  vin: string;
  recommendation: string;
  confidence?: number;
  reasoning?: string;
  data?: any;
}

export interface MatchResponse {
  matches: any[];
  total: number;
}

export class AiRecommenderApi {
  /**
   * Ask a natural-language question about inventory (RAG).
   */
  static async ask(question: string, k: number = 5): Promise<AskResponse> {
    return ApiService.request<AskResponse>('/v1/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, k }),
    });
  }

  /**
   * Get AI buy/pass recommendation for a vehicle by VIN.
   */
  static async recommend(vin: string): Promise<RecommendResponse> {
    return ApiService.request<RecommendResponse>('/v1/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vin }),
    });
  }

  /**
   * Match available vehicles to active leads.
   */
  static async match(limit: number = 10): Promise<MatchResponse> {
    return ApiService.request<MatchResponse>('/v1/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit }),
    });
  }
}
