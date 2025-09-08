"""YouTube Music schemas"""

from typing import Any

from pydantic import BaseModel


class YouTubeAuthResponse(BaseModel):
    """YouTube authentication response"""

    auth_url: str


class YouTubePlaylist(BaseModel):
    """YouTube playlist model"""

    id: str
    title: str
    description: str | None = ""
    thumbnail_url: str | None = None
    track_count: int
    privacy_status: str | None = "private"


class YouTubeTrack(BaseModel):
    """YouTube track model"""

    id: str
    title: str
    artist: str
    thumbnail_url: str | None = None
    youtube_url: str
    duration_seconds: int | None = None
    position: int | None = None
    added_at: str | None = None


class SleepAnalysisResult(BaseModel):
    """Sleep analysis result for a track"""

    video_id: str
    sleep_score: float  # 0-100
    tempo_bpm: float | None = None
    energy_level: float | None = None
    brightness_score: float | None = None
    loudness_lufs: float | None = None
    rhythm_complexity: float | None = None
    recommended_sleep_stages: list[str]
    optimal_play_time: str
    warnings: list[str]


class CreatePlaylistRequest(BaseModel):
    """Request to create a sleep playlist"""

    title: str
    description: str | None = ""
    track_ids: list[str]
    target_duration_minutes: float | None = 30
    sleep_goal: str | None = "general"  # "fall_asleep", "deep_sleep", "full_night"
    sync_to_youtube: bool | None = False


class SleepSessionRequest(BaseModel):
    """Request to start a sleep session"""

    playlist_id: str | None = None


class SleepSessionEndRequest(BaseModel):
    """Request to end a sleep session"""

    sleep_quality_rating: int | None = None  # 1-10
    fall_asleep_time_minutes: int | None = None
    wake_up_feeling: str | None = None  # "refreshed", "tired", "normal"
    tracks_played: list[dict[str, Any]] | None = None


class YouTubeMusicStatusResponse(BaseModel):
    """YouTube Music integration status"""

    connected: bool
    expires_at: str | None = None
    scopes: list[str] | None = []


class SleepPlaylistResponse(BaseModel):
    """Sleep playlist response"""

    id: str
    title: str
    description: str | None = ""
    youtube_playlist_id: str | None = None
    target_duration_minutes: float
    sleep_goal: str
    track_count: int
    total_duration_seconds: float
    average_sleep_score: float | None = None
    play_count: int
    last_played_at: str | None = None
    created_at: str
