"""
AI音楽生成API ルーター

睡眠・リラクゼーション音楽の生成、キャッシュ管理、音声配信機能を提供
"""

import io

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import Response, StreamingResponse

from app.schemas.ai_music import (
    CacheMetrics,
    GeneratedPlaylist,
    GeneratedTrack,
    MusicGenerationRequest,
    MusicGenerationResponse,
    MusicGenreEnum,
    PlaylistGenerationRequest,
    TrackLibraryResponse,
)
from app.services.ai_music_generator import ai_music_generator
from app.services.audio_cache import audio_cache
from app.services.mubert_service import mubert_service

router = APIRouter(prefix="/api/v1/ai-music", tags=["AI音楽生成"])


@router.post("/generate", response_model=MusicGenerationResponse)
async def generate_music(
    request: MusicGenerationRequest, background_tasks: BackgroundTasks
) -> MusicGenerationResponse:
    """
    AI音楽を生成

    Args:
        request: 音楽生成リクエスト
        background_tasks: バックグラウンドタスク

    Returns:
        生成結果
    """
    try:
        # キャッシュマネージャーを初期化（初回のみ）
        if not hasattr(audio_cache, "_initialized"):
            await audio_cache.initialize()
            audio_cache._initialized = True

        # 音楽を生成
        response = await ai_music_generator.generate_music(request)

        # バックグラウンドで期限切れキャッシュをクリーンアップ
        background_tasks.add_task(audio_cache.cleanup_expired_entries, 7)

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"音楽生成に失敗しました: {str(e)}")


@router.get("/tracks/{track_id}/audio")
async def get_track_audio(track_id: str) -> Response:
    """
    生成された音楽トラックの音声データを取得

    Args:
        track_id: トラックID（キャッシュキー）

    Returns:
        音声ファイル
    """
    try:
        audio_data = await ai_music_generator.get_track_audio(track_id)

        if not audio_data:
            raise HTTPException(
                status_code=404, detail="指定されたトラックが見つかりません"
            )

        # ファイル形式を判定（現在はWAVのみ）
        media_type = "audio/wav"
        file_extension = "wav"

        # ストリーミングレスポンス
        def audio_stream():
            yield audio_data

        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename=nocturne_track_{track_id}.{file_extension}",
                "Cache-Control": "public, max-age=3600",  # 1時間キャッシュ
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"音声データの取得に失敗しました: {str(e)}"
        )


@router.get("/tracks/{track_id}")
async def get_track_info(track_id: str) -> GeneratedTrack:
    """
    トラック情報を取得

    Args:
        track_id: トラックID

    Returns:
        トラック情報
    """
    try:
        # キャッシュからトラック情報を取得
        entry = audio_cache._cache_index.get(track_id)

        if not entry:
            raise HTTPException(
                status_code=404, detail="指定されたトラックが見つかりません"
            )

        # GeneratedTrackオブジェクトを構築
        metadata = entry.metadata
        track = GeneratedTrack(
            id=track_id,
            title=metadata.get("title", f"Generated Track {track_id[:8]}"),
            genre=metadata.get("genre", "sleep"),
            duration=metadata.get("duration", 1800),
            file_url=f"/api/v1/ai-music/tracks/{track_id}/audio",
            format=metadata.get("format", "wav"),
            bitrate=metadata.get("bitrate", 128),
            file_size=entry.file_size,
            created_at=entry.created_at,
            generation_method=metadata.get("generation_method", "cached"),
            metadata=metadata,
        )

        return track

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"トラック情報の取得に失敗しました: {str(e)}"
        )


@router.get("/library", response_model=TrackLibraryResponse)
async def get_track_library(
    page: int = Query(default=1, ge=1, description="ページ番号"),
    per_page: int = Query(default=20, ge=1, le=100, description="ページサイズ"),
    genre: MusicGenreEnum | None = Query(None, description="ジャンルフィルタ"),
) -> TrackLibraryResponse:
    """
    生成済みトラックライブラリを取得

    Args:
        page: ページ番号
        per_page: ページサイズ
        genre: ジャンルフィルタ

    Returns:
        トラック一覧
    """
    try:
        # キャッシュから全トラックを取得
        all_tracks = []

        for track_id, entry in audio_cache._cache_index.items():
            metadata = entry.metadata

            # ジャンルフィルタ
            if genre and metadata.get("genre") != genre.value:
                continue

            track = GeneratedTrack(
                id=track_id,
                title=metadata.get("title", f"Generated Track {track_id[:8]}"),
                genre=metadata.get("genre", "sleep"),
                duration=metadata.get("duration", 1800),
                file_url=f"/api/v1/ai-music/tracks/{track_id}/audio",
                format=metadata.get("format", "wav"),
                bitrate=metadata.get("bitrate", 128),
                file_size=entry.file_size,
                created_at=entry.created_at,
                generation_method=metadata.get("generation_method", "cached"),
                metadata=metadata,
            )

            all_tracks.append(track)

        # 作成日時で降順ソート
        all_tracks.sort(key=lambda t: t.created_at, reverse=True)

        # ページネーション
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        page_tracks = all_tracks[start_idx:end_idx]

        return TrackLibraryResponse(
            tracks=page_tracks,
            total_count=len(all_tracks),
            page=page,
            per_page=per_page,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"ライブラリの取得に失敗しました: {str(e)}"
        )


@router.delete("/tracks/{track_id}")
async def delete_track(track_id: str) -> dict:
    """
    トラックを削除

    Args:
        track_id: トラックID

    Returns:
        削除結果
    """
    try:
        success = await audio_cache.remove_cached_track(track_id)

        if not success:
            raise HTTPException(
                status_code=404, detail="指定されたトラックが見つかりません"
            )

        return {"message": f"トラック {track_id} を削除しました"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"トラックの削除に失敗しました: {str(e)}"
        )


@router.get("/cache/metrics", response_model=CacheMetrics)
async def get_cache_metrics() -> CacheMetrics:
    """
    キャッシュメトリクスを取得

    Returns:
        キャッシュ統計情報
    """
    try:
        metrics = await audio_cache.get_cache_metrics()
        return metrics

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"メトリクスの取得に失敗しました: {str(e)}"
        )


@router.post("/cache/cleanup")
async def cleanup_cache(
    max_age_days: int = Query(default=7, ge=1, le=30, description="最大保持日数"),
) -> dict:
    """
    キャッシュをクリーンアップ

    Args:
        max_age_days: 最大保持日数

    Returns:
        クリーンアップ結果
    """
    try:
        removed_count = await audio_cache.cleanup_expired_entries(max_age_days)

        return {
            "message": f"{removed_count}件のキャッシュエントリを削除しました",
            "removed_count": removed_count,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"キャッシュクリーンアップに失敗しました: {str(e)}"
        )


# プレイリスト生成（将来拡張）
@router.post("/playlists/generate", response_model=GeneratedPlaylist)
async def generate_playlist(_request: PlaylistGenerationRequest) -> GeneratedPlaylist:
    """
    AIプレイリストを生成（将来実装）

    Args:
        _request: プレイリスト生成リクエスト

    Returns:
        生成されたプレイリスト
    """
    # プレースホルダー実装
    raise HTTPException(status_code=501, detail="プレイリスト生成機能は開発中です")


# ヘルスチェック
@router.get("/health")
async def health_check() -> dict:
    """
    AI音楽生成サービスのヘルスチェック

    Returns:
        サービス状態
    """
    try:
        # キャッシュマネージャーの状態確認
        metrics = await audio_cache.get_cache_metrics()

        # Mubert サービスの状態確認
        mubert_health = await mubert_service.health_check()

        return {
            "status": "healthy",
            "service": "ai_music_generator",
            "cache_status": {
                "total_tracks": metrics.total_cached_tracks,
                "cache_size_mb": round(metrics.total_cache_size_mb, 2),
            },
            "mubert_status": mubert_health,
            "fallback_available": True,  # プログラマブル生成が常に利用可能
        }

    except Exception as e:
        raise HTTPException(
            status_code=503, detail=f"サービスが利用できません: {str(e)}"
        )
