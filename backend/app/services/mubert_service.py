"""
Mubert API統合サービス

高品質な睡眠音楽生成のためのMubert API統合
"""

import os
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx

from app.schemas.ai_music import (
    AudioFormatEnum,
    GeneratedTrack,
    IntensityEnum,
    MusicGenerationRequest,
    MusicGenerationResponse,
)


@dataclass
class StreamLink:
    """ストリームリンク情報"""

    url: str
    expires_at: float
    playlist_index: str


@dataclass
class MubertCustomer:
    """Mubert顧客情報"""

    customer_id: str
    access_token: str
    created_at: float


class MubertService:
    """Mubert API統合サービス"""

    def __init__(self):
        """初期化"""
        self.company_id = os.getenv("MUBERT_COMPANY_ID")
        self.license_token = os.getenv("MUBERT_LICENSE_TOKEN")
        self.base_url = "https://music-api.mubert.com/api/v3"

        # キャッシュ
        self._current_stream: StreamLink | None = None
        self._customer: MubertCustomer | None = None
        self._playlists_cache: dict[str, Any] | None = None
        self._playlists_cache_time: float = 0

        # 設定
        self.refresh_before_seconds = 300  # 5分前にリフレッシュ
        self.cache_duration = 3600  # プレイリストキャッシュ1時間

        # HTTPクライアント
        self.http_client = httpx.AsyncClient(timeout=30.0)

        # 睡眠関連タグ
        self.sleep_tags = {"sleep", "relax", "ambient", "calm", "meditation", "chill"}

    async def __aenter__(self):
        """非同期コンテキストマネージャー開始"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """非同期コンテキストマネージャー終了"""
        await self.http_client.aclose()

    def _is_available(self) -> bool:
        """Mubert APIが利用可能かチェック"""
        return bool(self.company_id and self.license_token)

    async def _get_or_create_customer(self) -> MubertCustomer:
        """
        Mubert顧客を取得または作成

        Returns:
            顧客情報
        """
        # 既存の顧客が有効な場合は再利用
        if (
            self._customer and (time.time() - self._customer.created_at) < 86400
        ):  # 24時間有効
            return self._customer

        # 新規顧客作成
        response = await self.http_client.post(
            f"{self.base_url}/service/customers",
            headers={
                "company-id": self.company_id,
                "license-token": self.license_token,
                "Content-Type": "application/json",
            },
            json={
                "custom_id": f"nocturne-sleeper-{int(time.time())}",
                "email": "sleep@nocturne.app",  # 仮のメール
            },
        )
        response.raise_for_status()

        data = response.json()
        self._customer = MubertCustomer(
            customer_id=data["customer_id"],
            access_token=data["access_token"],
            created_at=time.time(),
        )

        return self._customer

    async def _get_sleep_playlist_index(self) -> str:
        """
        睡眠用プレイリストのインデックスを取得

        Returns:
            プレイリストインデックス
        """
        # キャッシュチェック
        current_time = time.time()
        if (
            self._playlists_cache
            and current_time - self._playlists_cache_time < self.cache_duration
        ):
            return self._playlists_cache["sleep_index"]

        customer = await self._get_or_create_customer()

        # プレイリスト一覧取得
        response = await self.http_client.get(
            f"{self.base_url}/public/playlists",
            headers={
                "customer-id": customer.customer_id,
                "access-token": customer.access_token,
            },
        )
        response.raise_for_status()

        playlists = response.json().get("playlists", [])

        # 睡眠関連プレイリストを検索
        sleep_playlist = None
        for playlist in playlists:
            tags = [tag.lower() for tag in playlist.get("tags", [])]
            name = playlist.get("name", "").lower()

            if any(tag in self.sleep_tags for tag in tags) or any(
                word in name for word in self.sleep_tags
            ):
                sleep_playlist = playlist
                break

        if not sleep_playlist:
            raise RuntimeError("睡眠用プレイリストが見つかりませんでした")

        # キャッシュ更新
        self._playlists_cache = {
            "sleep_index": sleep_playlist["playlist_index"],
            "sleep_name": sleep_playlist.get("name", "Sleep"),
        }
        self._playlists_cache_time = current_time

        return self._playlists_cache["sleep_index"]

    async def _get_stream_link(
        self, intensity: IntensityEnum = IntensityEnum.LOW
    ) -> StreamLink:
        """
        ストリームリンクを取得

        Args:
            intensity: 音楽の強度

        Returns:
            ストリームリンク情報
        """
        customer = await self._get_or_create_customer()
        playlist_index = await self._get_sleep_playlist_index()

        # ストリームリンク取得
        response = await self.http_client.post(
            f"{self.base_url}/public/streaming/get-link",
            headers={
                "customer-id": customer.customer_id,
                "access-token": customer.access_token,
                "Content-Type": "application/json",
            },
            json={
                "playlist_index": playlist_index,
                "bitrate": 128,
                "intensity": intensity.value,
                "type": "http",
            },
        )
        response.raise_for_status()

        data = response.json()
        ttl = data.get("ttl", 3600)  # デフォルト1時間

        return StreamLink(
            url=data["stream_url"],
            expires_at=time.time() + ttl,
            playlist_index=playlist_index,
        )

    async def get_sleep_stream_url(
        self, intensity: IntensityEnum = IntensityEnum.LOW
    ) -> str:
        """
        睡眠音楽ストリームURLを取得（キャッシュ付き）

        Args:
            intensity: 音楽の強度

        Returns:
            ストリームURL
        """
        if not self._is_available():
            raise RuntimeError("Mubert APIキーが設定されていません")

        # 既存のストリームが有効かチェック
        current_time = time.time()
        if (
            self._current_stream
            and self._current_stream.expires_at - current_time
            > self.refresh_before_seconds
        ):
            return self._current_stream.url

        # 新しいストリームリンクを取得
        self._current_stream = await self._get_stream_link(intensity)
        return self._current_stream.url

    async def generate_sleep_track(
        self, request: MusicGenerationRequest
    ) -> MusicGenerationResponse:
        """
        睡眠音楽トラックを生成（Mubert API使用）

        Args:
            request: 音楽生成リクエスト

        Returns:
            生成結果
        """
        try:
            if not self._is_available():
                raise RuntimeError("Mubert APIキーが設定されていません")

            customer = await self._get_or_create_customer()
            playlist_index = await self._get_sleep_playlist_index()

            # トラック生成リクエスト
            response = await self.http_client.post(
                f"{self.base_url}/public/tracks",
                headers={
                    "customer-id": customer.customer_id,
                    "access-token": customer.access_token,
                    "Content-Type": "application/json",
                },
                json={
                    "playlist_index": playlist_index,
                    "mode": "track",
                    "duration": request.duration,
                    "bitrate": request.bitrate or 128,
                    "intensity": request.intensity.value,
                    "format": "mp3",  # Mubert はMP3がメイン
                },
            )
            response.raise_for_status()

            data = response.json()

            # GeneratedTrack オブジェクト作成
            track = GeneratedTrack(
                id=data.get("track_id", f"mubert-{int(time.time())}"),
                title=f"Mubert Sleep - {request.intensity.value.title()}",
                genre=request.genre,
                duration=request.duration,
                format=AudioFormatEnum.MP3,
                bitrate=request.bitrate or 128,
                file_size=data.get("file_size", 0),
                file_url=data.get("download_url", ""),
                created_at=datetime.utcnow(),
                generation_method="mubert_api",
            )

            return MusicGenerationResponse(success=True, track=track)

        except Exception as e:
            return MusicGenerationResponse(
                success=False, error_message=f"Mubert音楽生成エラー: {str(e)}"
            )

    async def health_check(self) -> dict[str, Any]:
        """
        Mubert APIの健康状態をチェック

        Returns:
            健康状態情報
        """
        if not self._is_available():
            return {"status": "unavailable", "reason": "API keys not configured"}

        try:
            customer = await self._get_or_create_customer()
            return {
                "status": "healthy",
                "customer_id": customer.customer_id[:8]
                + "...",  # セキュリティのため部分表示
                "cache_status": {
                    "stream_cached": bool(self._current_stream),
                    "playlists_cached": bool(self._playlists_cache),
                },
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}


# グローバルサービスインスタンス
mubert_service = MubertService()
