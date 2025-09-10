"""
AI音楽生成サービス

段階的導入戦略に基づいて複数の音楽生成手法をサポート：
1. Web Audio API ベース（フロントエンド生成）
2. プログラマブル音楽生成（算術ベース）
3. Mubert API 統合（将来）
"""

from app.schemas.ai_music import (
    GeneratedTrack,
    MusicGenerationRequest,
    MusicGenerationResponse,
)
from app.services.audio_cache import audio_cache
from app.services.audiocraft_service import audiocraft_generator


class AIMusicGenerator:
    """AI音楽生成サービス"""

    def __init__(self) -> None:
        """初期化"""
        pass

    async def generate_music(
        self, request: MusicGenerationRequest
    ) -> MusicGenerationResponse:
        """
        音楽を生成

        Args:
            request: 音楽生成リクエスト

        Returns:
            生成結果
        """
        try:
            # キャッシュチェック
            generation_params = {
                "genre": request.genre.value,
                "duration": request.duration,
                "intensity": request.intensity.value,
                "format": request.format.value,
                "bitrate": request.bitrate,
                "prompt": request.prompt,
            }

            cached_track = await audio_cache.get_cached_track(generation_params)
            if cached_track:
                return MusicGenerationResponse(success=True, track=cached_track)

            # 新規生成 - AudioCraftのみ使用
            track, audio_data = await self._generate_audiocraft_music(request)

            return MusicGenerationResponse(success=True, track=track)

        except Exception as e:
            return MusicGenerationResponse(
                success=False, error_message=f"音楽生成エラー: {str(e)}"
            )

    async def _generate_audiocraft_music(
        self, request: MusicGenerationRequest
    ) -> tuple[GeneratedTrack, bytes]:
        """AudioCraft音楽生成"""
        try:
            track, audio_data = await audiocraft_generator.generate_music(request)

            # キャッシュに保存
            generation_params = {
                "genre": request.genre.value,
                "duration": request.duration,
                "intensity": request.intensity.value,
                "format": request.format.value,
                "bitrate": request.bitrate,
                "prompt": request.prompt,
            }

            cache_key = await audio_cache.cache_track(
                track, audio_data, generation_params
            )

            # ファイルURLを更新
            track.file_url = f"/api/v1/ai-music/tracks/{cache_key}/audio"

            return track, audio_data

        except Exception as e:
            print(f"AudioCraft generation error: {e}")
            raise

    async def get_track_audio(self, track_id: str) -> bytes | None:
        """
        トラックの音声データを取得

        Args:
            track_id: トラックID（キャッシュキー）

        Returns:
            音声データ（バイト）
        """
        try:
            # キャッシュからエントリを取得
            entry = audio_cache._cache_index.get(track_id)
            if not entry:
                return None

            # ファイルを読み込み
            with open(entry.file_path, "rb") as f:
                return f.read()

        except Exception as e:
            print(f"Error getting track audio: {e}")
            return None


# グローバル音楽生成サービス
ai_music_generator = AIMusicGenerator()
