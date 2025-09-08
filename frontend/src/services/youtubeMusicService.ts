// YouTube Music integration service for frontend
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  track_count: number;
  privacy_status: string;
}

export interface YouTubeTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail_url: string | null;
  youtube_url: string;
  duration_seconds?: number;
  position?: number;
  added_at?: string;
  sleep_analysis?: SleepAnalysis;
}

export interface SleepAnalysis {
  sleep_score: number;
  tempo_bpm?: number;
  energy_level?: number;
  recommended_sleep_stages: string[];
  optimal_play_time: string;
  warnings: string[];
}

export interface SleepPlaylist {
  id: string;
  title: string;
  description: string;
  youtube_playlist_id?: string;
  target_duration_minutes: number;
  sleep_goal: string;
  track_count: number;
  total_duration_seconds: number;
  average_sleep_score?: number;
  play_count: number;
  last_played_at?: string;
  created_at: string;
}

export interface CreatePlaylistRequest {
  title: string;
  description?: string;
  track_ids: string[];
  target_duration_minutes?: number;
  sleep_goal?: 'fall_asleep' | 'deep_sleep' | 'full_night' | 'general';
  sync_to_youtube?: boolean;
}

export interface SleepSession {
  session_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  sleep_quality_rating?: number;
}

class YouTubeMusicService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getAuthUrl(): Promise<string> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/youtube-music/auth/url`, {
      headers: this.getAuthHeaders()
    });
    return response.data.auth_url;
  }

  async getConnectionStatus(): Promise<{
    connected: boolean;
    expires_at?: string;
    scopes?: string[];
  }> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/youtube-music/status`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async disconnect(): Promise<void> {
    await axios.delete(`${API_BASE_URL}/api/v1/youtube-music/disconnect`, {
      headers: this.getAuthHeaders()
    });
  }

  async getPlaylists(): Promise<YouTubePlaylist[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/youtube-music/playlists`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getPlaylistTracks(playlistId: string): Promise<YouTubeTrack[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/youtube-music/playlists/${playlistId}/tracks`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async searchTracks(query: string): Promise<YouTubeTrack[]> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/youtube-music/search`, {
      params: { q: query },
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getTrackDetails(videoId: string): Promise<YouTubeTrack> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/youtube-music/track/${videoId}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async createSleepPlaylist(request: CreatePlaylistRequest): Promise<SleepPlaylist> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/youtube-music/playlist/create`,
      request,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getSleepPlaylists(): Promise<SleepPlaylist[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/youtube-music/playlists/sleep`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async startSleepSession(playlistId?: string): Promise<SleepSession> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/youtube-music/session/start`,
      { playlist_id: playlistId },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async endSleepSession(
    sessionId: string,
    feedback?: {
      sleep_quality_rating?: number;
      fall_asleep_time_minutes?: number;
      wake_up_feeling?: 'refreshed' | 'tired' | 'normal';
    }
  ): Promise<SleepSession> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/youtube-music/session/${sessionId}/end`,
      feedback,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Helper methods for sleep analysis
  getSleepScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  }

  getSleepScoreLabel(score: number): string {
    if (score >= 80) return '睡眠に最適';
    if (score >= 60) return '良い';
    if (score >= 40) return '普通';
    return '要注意';
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分${secs}秒`;
  }

  getSleepStageLabel(stage: string): string {
    const labels: { [key: string]: string } = {
      'pre_sleep': '入眠前',
      'light_sleep': '浅い睡眠',
      'deep_sleep': '深い睡眠',
      'rem_sleep': 'REM睡眠',
      'background': '背景音楽'
    };
    return labels[stage] || stage;
  }

  getOptimalPlayTimeLabel(time: string): string {
    const labels: { [key: string]: string } = {
      'bedtime': '就寝時',
      'deep_night': '深夜',
      'wake_up': '起床時',
      'anytime': 'いつでも'
    };
    return labels[time] || time;
  }
}

export const youtubeMusicService = new YouTubeMusicService();