const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Journey {
  id: number;
  title: string;
  description?: string;
  duration_sec: number;
  thumbnail_url?: string;
  category?: string;
  play_count: number;
  rating: number;
}

export interface JourneyDetail extends Journey {
  segments: Segment[];
  created_at: string;
  updated_at: string;
}

export interface Segment {
  id: number;
  journey_id: number;
  time_sec: number;
  order: number;
  type: 'narration' | 'music' | 'sfx' | 'action';
  content: {
    text?: string;
    audio_url?: string;
    gain?: number;
    loop?: boolean;
    [key: string]: unknown;
  };
  duration_sec?: number;
  fade_in_sec: number;
  fade_out_sec: number;
}

export interface AudioFile {
  id: number;
  filename: string;
  display_name: string;
  category: string;
  duration_sec?: number;
  tags?: string[];
  url: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  // Journey APIs
  async getJourneys(params?: {
    skip?: number;
    limit?: number;
    category?: string;
  }): Promise<Journey[]> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.category) searchParams.set('category', params.category);
    
    const query = searchParams.toString();
    return this.request<Journey[]>(`/api/v1/journeys/${query ? `?${query}` : ''}`);
  }

  async getJourney(id: number): Promise<JourneyDetail> {
    return this.request<JourneyDetail>(`/api/v1/journeys/${id}`);
  }

  async getFeaturedJourneys(): Promise<Journey[]> {
    return this.request<Journey[]>('/api/v1/journeys/featured');
  }

  async getCategories(): Promise<string[]> {
    return this.request<string[]>('/api/v1/journeys/categories');
  }

  // Audio APIs
  async getAudioFiles(params?: {
    category?: string;
    skip?: number;
    limit?: number;
  }): Promise<AudioFile[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<AudioFile[]>(`/api/v1/audio/${query ? `?${query}` : ''}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }
}

export const api = new ApiClient();