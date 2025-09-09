"""
音声ファイルキャッシュシステム

AI音楽生成で作成された音声ファイルの効率的な管理とキャッシュ機能を提供
"""

import asyncio
import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import aiofiles

from app.schemas.ai_music import CacheMetrics, GeneratedTrack


@dataclass
class CacheEntry:
    """キャッシュエントリ情報"""
    file_path: str
    metadata: dict[str, Any]
    created_at: datetime
    last_accessed: datetime
    access_count: int
    file_size: int


class AudioCacheManager:
    """音声ファイルキャッシュマネージャー"""

    def __init__(self, cache_dir: str | None = None, max_size_mb: int = 1024):
        """
        初期化

        Args:
            cache_dir: キャッシュディレクトリパス（Noneの場合はデフォルト使用）
            max_size_mb: 最大キャッシュサイズ（MB）
        """
        self.cache_dir = Path(cache_dir or "cache/audio")
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.metadata_file = self.cache_dir / "cache_metadata.json"
        self._cache_index: dict[str, CacheEntry] = {}
        self._lock = asyncio.Lock()

        # キャッシュディレクトリを作成
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    async def initialize(self) -> None:
        """キャッシュマネージャーを初期化"""
        await self._load_metadata()
        await self._cleanup_invalid_entries()

    def _generate_cache_key(self, generation_params: dict[str, Any]) -> str:
        """
        生成パラメータからキャッシュキーを生成

        Args:
            generation_params: 音楽生成パラメータ

        Returns:
            キャッシュキー（ハッシュ値）
        """
        # パラメータを正規化してハッシュ化
        normalized = json.dumps(generation_params, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]

    async def get_cached_track(self, generation_params: dict[str, Any]) -> GeneratedTrack | None:
        """
        キャッシュから音楽トラックを取得

        Args:
            generation_params: 音楽生成パラメータ

        Returns:
            キャッシュされたトラック（存在しない場合はNone）
        """
        cache_key = self._generate_cache_key(generation_params)

        async with self._lock:
            if cache_key not in self._cache_index:
                return None

            entry = self._cache_index[cache_key]

            # ファイルの存在確認
            if not Path(entry.file_path).exists():
                await self._remove_cache_entry(cache_key)
                return None

            # アクセス情報を更新
            entry.last_accessed = datetime.utcnow()
            entry.access_count += 1
            await self._save_metadata()

            # GeneratedTrackオブジェクトを構築
            track_metadata = entry.metadata
            return GeneratedTrack(
                id=cache_key,
                title=track_metadata.get("title", f"Generated Track {cache_key[:8]}"),
                genre=track_metadata.get("genre", "sleep"),
                duration=track_metadata.get("duration", 1800),
                file_url=f"/audio/cache/{cache_key}",
                format=track_metadata.get("format", "mp3"),
                bitrate=track_metadata.get("bitrate", 128),
                file_size=entry.file_size,
                created_at=entry.created_at,
                generation_method=track_metadata.get("generation_method", "cached"),
                metadata=track_metadata
            )

    async def cache_track(self, track: GeneratedTrack, audio_data: bytes,
                         generation_params: dict[str, Any]) -> str:
        """
        音楽トラックをキャッシュに保存

        Args:
            track: 生成されたトラック情報
            audio_data: 音声データ（バイト）
            generation_params: 生成パラメータ

        Returns:
            キャッシュキー
        """
        cache_key = self._generate_cache_key(generation_params)
        file_extension = track.format.value if hasattr(track.format, 'value') else str(track.format)
        cache_file_path = self.cache_dir / f"{cache_key}.{file_extension}"

        async with self._lock:
            # キャッシュサイズチェック・クリーンアップ
            await self._ensure_cache_space(len(audio_data))

            # ファイルを保存
            async with aiofiles.open(cache_file_path, 'wb') as f:
                await f.write(audio_data)

            # キャッシュエントリを追加
            entry = CacheEntry(
                file_path=str(cache_file_path),
                metadata={
                    "title": track.title,
                    "genre": track.genre,
                    "duration": track.duration,
                    "format": track.format,
                    "bitrate": track.bitrate,
                    "generation_method": track.generation_method,
                    "generation_params": generation_params
                },
                created_at=datetime.utcnow(),
                last_accessed=datetime.utcnow(),
                access_count=1,
                file_size=len(audio_data)
            )

            self._cache_index[cache_key] = entry
            await self._save_metadata()

        return cache_key

    async def remove_cached_track(self, cache_key: str) -> bool:
        """
        キャッシュからトラックを削除

        Args:
            cache_key: キャッシュキー

        Returns:
            削除成功フラグ
        """
        async with self._lock:
            return await self._remove_cache_entry(cache_key)

    async def get_cache_metrics(self) -> CacheMetrics:
        """キャッシュメトリクスを取得"""
        async with self._lock:
            total_size = sum(entry.file_size for entry in self._cache_index.values())
            entries = list(self._cache_index.values())

            oldest = min((e.created_at for e in entries), default=None)
            newest = max((e.created_at for e in entries), default=None)

            # ヒット率計算（簡易版：アクセス数が2以上のエントリの割合）
            hit_entries = sum(1 for e in entries if e.access_count > 1)
            hit_rate = hit_entries / len(entries) if entries else 0.0

            return CacheMetrics(
                total_cached_tracks=len(self._cache_index),
                total_cache_size_mb=total_size / (1024 * 1024),
                cache_hit_rate=hit_rate,
                oldest_cache_entry=oldest,
                newest_cache_entry=newest
            )

    async def cleanup_expired_entries(self, max_age_days: int = 7) -> int:
        """
        期限切れエントリをクリーンアップ

        Args:
            max_age_days: 最大保持日数

        Returns:
            削除したエントリ数
        """
        cutoff_date = datetime.utcnow() - timedelta(days=max_age_days)
        removed_count = 0

        async with self._lock:
            keys_to_remove = [
                key for key, entry in self._cache_index.items()
                if entry.last_accessed < cutoff_date
            ]

            for key in keys_to_remove:
                if await self._remove_cache_entry(key):
                    removed_count += 1

        return removed_count

    async def _ensure_cache_space(self, required_bytes: int) -> None:
        """必要な容量を確保するためにキャッシュをクリーンアップ"""
        current_size = sum(entry.file_size for entry in self._cache_index.values())

        if current_size + required_bytes <= self.max_size_bytes:
            return

        # LRU (Least Recently Used) でエントリを削除
        entries_by_access = sorted(
            self._cache_index.items(),
            key=lambda x: x[1].last_accessed
        )

        for cache_key, entry in entries_by_access:
            await self._remove_cache_entry(cache_key)
            current_size -= entry.file_size

            if current_size + required_bytes <= self.max_size_bytes:
                break

    async def _remove_cache_entry(self, cache_key: str) -> bool:
        """キャッシュエントリを削除"""
        if cache_key not in self._cache_index:
            return False

        entry = self._cache_index[cache_key]

        # ファイルを削除
        try:
            if Path(entry.file_path).exists():
                os.remove(entry.file_path)
        except Exception as e:
            print(f"Error removing cache file {entry.file_path}: {e}")

        # インデックスから削除
        del self._cache_index[cache_key]
        await self._save_metadata()

        return True

    async def _load_metadata(self) -> None:
        """キャッシュメタデータを読み込み"""
        if not self.metadata_file.exists():
            self._cache_index = {}
            return

        try:
            async with aiofiles.open(self.metadata_file, encoding='utf-8') as f:
                content = await f.read()
                metadata = json.loads(content)

                for cache_key, entry_data in metadata.items():
                    self._cache_index[cache_key] = CacheEntry(
                        file_path=entry_data["file_path"],
                        metadata=entry_data["metadata"],
                        created_at=datetime.fromisoformat(entry_data["created_at"]),
                        last_accessed=datetime.fromisoformat(entry_data["last_accessed"]),
                        access_count=entry_data["access_count"],
                        file_size=entry_data["file_size"]
                    )
        except Exception as e:
            print(f"Error loading cache metadata: {e}")
            self._cache_index = {}

    async def _save_metadata(self) -> None:
        """キャッシュメタデータを保存"""
        metadata = {}
        for cache_key, entry in self._cache_index.items():
            metadata[cache_key] = {
                "file_path": entry.file_path,
                "metadata": entry.metadata,
                "created_at": entry.created_at.isoformat(),
                "last_accessed": entry.last_accessed.isoformat(),
                "access_count": entry.access_count,
                "file_size": entry.file_size
            }

        try:
            async with aiofiles.open(self.metadata_file, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(metadata, ensure_ascii=False, indent=2))
        except Exception as e:
            print(f"Error saving cache metadata: {e}")

    async def _cleanup_invalid_entries(self) -> None:
        """無効なキャッシュエントリをクリーンアップ"""
        invalid_keys = []

        for cache_key, entry in self._cache_index.items():
            if not Path(entry.file_path).exists():
                invalid_keys.append(cache_key)

        for key in invalid_keys:
            del self._cache_index[key]

        if invalid_keys:
            await self._save_metadata()


# グローバルキャッシュマネージャーインスタンス
audio_cache = AudioCacheManager()
