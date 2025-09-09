"""
AI音楽生成機能用のPydanticスキーマ
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class MusicGenreEnum(str, Enum):
    """音楽ジャンル"""

    AMBIENT = "ambient"
    NATURE_SOUNDS = "nature_sounds"
    WHITE_NOISE = "white_noise"
    MEDITATION = "meditation"
    SLEEP = "sleep"
    LULLABY = "lullaby"
    BINAURAL = "binaural"


class IntensityEnum(str, Enum):
    """音楽の強度"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AudioFormatEnum(str, Enum):
    """音声フォーマット"""

    MP3 = "mp3"
    WAV = "wav"
    OGG = "ogg"


class MusicGenerationRequest(BaseModel):
    """音楽生成リクエスト"""

    genre: MusicGenreEnum = Field(
        default=MusicGenreEnum.SLEEP, description="音楽ジャンル"
    )
    duration: int = Field(default=1800, ge=30, le=7200, description="再生時間（秒）")
    intensity: IntensityEnum = Field(
        default=IntensityEnum.LOW, description="音楽の強度"
    )
    format: AudioFormatEnum = Field(
        default=AudioFormatEnum.MP3, description="音声フォーマット"
    )
    bitrate: int = Field(default=128, ge=64, le=320, description="ビットレート")
    prompt: str | None = Field(None, max_length=500, description="カスタムプロンプト")
    user_preferences: dict[str, Any] | None = Field(
        default_factory=dict, description="ユーザー設定"
    )


class GeneratedTrack(BaseModel):
    """生成された音楽トラック情報"""

    id: str = Field(description="トラックID")
    title: str = Field(description="トラック名")
    genre: MusicGenreEnum = Field(description="ジャンル")
    duration: int = Field(description="再生時間（秒）")
    file_url: str | None = Field(None, description="音声ファイルURL")
    streaming_url: str | None = Field(None, description="ストリーミングURL")
    format: AudioFormatEnum = Field(description="音声フォーマット")
    bitrate: int = Field(description="ビットレート")
    file_size: int | None = Field(None, description="ファイルサイズ（バイト）")
    created_at: datetime = Field(description="生成日時")
    expires_at: datetime | None = Field(None, description="有効期限")
    generation_method: str = Field(description="生成手法（web_audio/mubert/etc）")
    metadata: dict[str, Any] | None = Field(
        default_factory=dict, description="追加メタデータ"
    )


class MusicGenerationResponse(BaseModel):
    """音楽生成レスポンス"""

    success: bool = Field(description="生成成功フラグ")
    track: GeneratedTrack | None = Field(None, description="生成された音楽トラック")
    generation_id: str | None = Field(None, description="生成処理ID（非同期処理用）")
    estimated_completion_time: int | None = Field(
        None, description="完了予定時間（秒）"
    )
    error_message: str | None = Field(None, description="エラーメッセージ")


class GenerationStatus(BaseModel):
    """音楽生成状態"""

    generation_id: str = Field(description="生成処理ID")
    status: str = Field(description="ステータス（pending/processing/completed/failed）")
    progress: int = Field(default=0, ge=0, le=100, description="進捗率")
    track: GeneratedTrack | None = Field(None, description="完了時のトラック情報")
    error_message: str | None = Field(None, description="エラーメッセージ")
    created_at: datetime = Field(description="開始日時")
    updated_at: datetime = Field(description="更新日時")


class TrackLibraryResponse(BaseModel):
    """トラックライブラリレスポンス"""

    tracks: list[GeneratedTrack] = Field(description="トラック一覧")
    total_count: int = Field(description="総数")
    page: int = Field(default=1, description="ページ番号")
    per_page: int = Field(default=20, description="ページサイズ")


class CacheMetrics(BaseModel):
    """キャッシュメトリクス"""

    total_cached_tracks: int = Field(description="キャッシュされたトラック数")
    total_cache_size_mb: float = Field(description="総キャッシュサイズ（MB）")
    cache_hit_rate: float = Field(description="キャッシュヒット率")
    oldest_cache_entry: datetime | None = Field(
        None, description="最古のキャッシュエントリ日時"
    )
    newest_cache_entry: datetime | None = Field(
        None, description="最新のキャッシュエントリ日時"
    )


class PlaylistGenerationRequest(BaseModel):
    """プレイリスト生成リクエスト"""

    name: str = Field(max_length=200, description="プレイリスト名")
    description: str | None = Field(
        None, max_length=1000, description="プレイリスト説明"
    )
    total_duration: int = Field(ge=300, le=28800, description="総再生時間（秒）")
    genres: list[MusicGenreEnum] = Field(min_items=1, description="含めるジャンル")
    track_count: int = Field(default=5, ge=1, le=20, description="トラック数")
    intensity_variation: bool = Field(
        default=True, description="強度バリエーション有無"
    )
    seamless_transitions: bool = Field(default=True, description="シームレス遷移有無")


class GeneratedPlaylist(BaseModel):
    """生成されたプレイリスト"""

    id: str = Field(description="プレイリストID")
    name: str = Field(description="プレイリスト名")
    description: str | None = Field(None, description="プレイリスト説明")
    tracks: list[GeneratedTrack] = Field(description="含まれるトラック")
    total_duration: int = Field(description="総再生時間（秒）")
    created_at: datetime = Field(description="作成日時")
    expires_at: datetime | None = Field(None, description="有効期限")
