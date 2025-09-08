"""YouTube Music integration models"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class YouTubeMusicIntegration(Base):
    """YouTube Music integration for users"""

    __tablename__ = "youtube_music_integrations"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    encrypted_access_token = Column(Text, nullable=False)
    encrypted_refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    scopes = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="youtube_integration")


class YouTubeMusicCache(Base):
    """Cache for YouTube Music data"""

    __tablename__ = "youtube_music_cache"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    cache_key = Column(
        String, nullable=False, index=True
    )  # e.g., "playlists", "tracks:{playlist_id}"
    cache_data = Column(JSON, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SleepMusicAnalysis(Base):
    """Analysis results for sleep suitability of music"""

    __tablename__ = "sleep_music_analysis"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    video_id = Column(String, nullable=False, unique=True, index=True)
    title = Column(String, nullable=False)
    artist = Column(String, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    # Sleep analysis scores
    sleep_score = Column(Float, nullable=False)  # 0-100
    tempo_bpm = Column(Float, nullable=True)
    energy_level = Column(Float, nullable=True)  # 0-1
    brightness_score = Column(Float, nullable=True)  # 0-100
    loudness_lufs = Column(Float, nullable=True)
    rhythm_complexity = Column(Float, nullable=True)  # 0-100

    # Recommendations
    recommended_sleep_stages = Column(
        JSON, nullable=True
    )  # ["pre_sleep", "deep_sleep", etc.]
    optimal_play_time = Column(String, nullable=True)  # "bedtime", "midnight", etc.
    warnings = Column(JSON, nullable=True)  # List of warning messages

    # Metadata
    analysis_version = Column(String, default="1.0")
    analyzed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserSleepPlaylist(Base):
    """User's custom sleep playlists"""

    __tablename__ = "user_sleep_playlists"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    youtube_playlist_id = Column(String, nullable=True)  # If synced with YouTube
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Playlist configuration
    target_duration_minutes = Column(Float, default=30)
    sleep_goal = Column(
        String, default="general"
    )  # "fall_asleep", "deep_sleep", "full_night"
    tracks = Column(JSON, nullable=False, default=list)  # List of video IDs with order

    # Statistics
    total_duration_seconds = Column(Float, default=0)
    average_sleep_score = Column(Float, nullable=True)
    play_count = Column(Float, default=0)
    last_played_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserSleepSession(Base):
    """Record of user's sleep sessions with music"""

    __tablename__ = "user_sleep_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    playlist_id = Column(String, ForeignKey("user_sleep_playlists.id"), nullable=True)

    # Session data
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    tracks_played = Column(
        JSON, nullable=False, default=list
    )  # List of {video_id, played_at, duration}

    # Sleep quality metrics
    sleep_quality_rating = Column(Float, nullable=True)  # 1-10
    fall_asleep_time_minutes = Column(Float, nullable=True)
    wake_up_feeling = Column(String, nullable=True)  # "refreshed", "tired", "normal"

    # Biometric data (if available)
    average_heart_rate = Column(Float, nullable=True)
    lowest_heart_rate = Column(Float, nullable=True)
    movement_count = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
