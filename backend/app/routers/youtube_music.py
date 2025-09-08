"""YouTube Music API routes"""

import os
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db.database import get_db
from app.models import User
from app.models.youtube_integration import (
    SleepMusicAnalysis,
    UserSleepPlaylist,
    UserSleepSession,
    YouTubeMusicCache,
    YouTubeMusicIntegration,
)
from app.schemas.youtube_music import (
    CreatePlaylistRequest,
    SleepSessionRequest,
    YouTubePlaylist,
    YouTubeTrack,
)
from app.services.youtube_music import YouTubeMusicService, YTMusicPersonalService

router = APIRouter(prefix="/api/v1/youtube-music", tags=["youtube-music"])

# Initialize services
youtube_service = YouTubeMusicService()
ytmusic_service = YTMusicPersonalService()


@router.get("/auth/url")
async def get_auth_url(
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Get YouTube OAuth2 authorization URL"""
    try:
        auth_url = await youtube_service.get_auth_url(state=current_user.id)
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auth/callback")
async def handle_auth_callback(
    code: str = Query(...), state: str = Query(...), db: Session = Depends(get_db)
) -> RedirectResponse:
    """Handle OAuth2 callback from YouTube"""
    try:
        # Exchange code for tokens
        token_data = await youtube_service.exchange_code_for_token(code)

        # Get or create integration record
        integration = db.query(YouTubeMusicIntegration).filter_by(user_id=state).first()

        if not integration:
            integration = YouTubeMusicIntegration(user_id=state)
            db.add(integration)

        # Encrypt and store tokens
        integration.encrypted_access_token = youtube_service.encrypt_token(
            token_data["access_token"]
        )
        if token_data.get("refresh_token"):
            integration.encrypted_refresh_token = youtube_service.encrypt_token(
                token_data["refresh_token"]
            )

        integration.expires_at = (
            datetime.fromisoformat(token_data["expires_at"])
            if token_data.get("expires_at")
            else None
        )
        integration.scopes = token_data.get("scopes", [])
        integration.is_active = True
        integration.updated_at = datetime.utcnow()

        db.commit()

        # Redirect to frontend success page
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(url=f"{frontend_url}/settings?youtube_connected=true")

    except Exception as e:
        # Redirect to frontend error page
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(url=f"{frontend_url}/settings?youtube_error={str(e)}")


@router.get("/status")
async def get_integration_status(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict[str, Any]:
    """Check YouTube Music integration status"""
    integration = (
        db.query(YouTubeMusicIntegration).filter_by(user_id=current_user.id).first()
    )

    if not integration:
        return {"connected": False}

    # Check if token is expired
    is_expired = False
    if integration.expires_at:
        is_expired = integration.expires_at < datetime.utcnow()

    return {
        "connected": integration.is_active and not is_expired,
        "expires_at": integration.expires_at.isoformat()
        if integration.expires_at
        else None,
        "scopes": integration.scopes or [],
    }


@router.delete("/disconnect")
async def disconnect_youtube(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict[str, str]:
    """Disconnect YouTube Music integration"""
    integration = (
        db.query(YouTubeMusicIntegration).filter_by(user_id=current_user.id).first()
    )

    if integration:
        integration.is_active = False
        integration.updated_at = datetime.utcnow()
        db.commit()

    return {"message": "YouTube Music disconnected successfully"}


@router.get("/playlists", response_model=list[YouTubePlaylist])
async def get_playlists(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    """Get user's YouTube playlists"""
    # Get integration
    integration = (
        db.query(YouTubeMusicIntegration).filter_by(user_id=current_user.id).first()
    )

    if not integration or not integration.is_active:
        raise HTTPException(status_code=404, detail="YouTube Music not connected")

    # Check cache first
    cache_key = f"playlists:{current_user.id}"
    cache = (
        db.query(YouTubeMusicCache)
        .filter_by(user_id=current_user.id, cache_key=cache_key)
        .first()
    )

    if cache and cache.expires_at > datetime.utcnow():
        return cache.cache_data

    try:
        # Decrypt token and get playlists
        access_token = youtube_service.decrypt_token(integration.encrypted_access_token)
        playlists = await youtube_service.get_user_playlists(access_token)

        # Update cache
        if cache:
            cache.cache_data = playlists
            cache.expires_at = datetime.utcnow() + timedelta(hours=1)
            cache.updated_at = datetime.utcnow()
        else:
            cache = YouTubeMusicCache(
                user_id=current_user.id,
                cache_key=cache_key,
                cache_data=playlists,
                expires_at=datetime.utcnow() + timedelta(hours=1),
            )
            db.add(cache)

        db.commit()

        return playlists

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/playlists/{playlist_id}/tracks", response_model=list[YouTubeTrack])
async def get_playlist_tracks(
    playlist_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Get tracks from a specific playlist"""
    # Get integration
    integration = (
        db.query(YouTubeMusicIntegration).filter_by(user_id=current_user.id).first()
    )

    if not integration or not integration.is_active:
        raise HTTPException(status_code=404, detail="YouTube Music not connected")

    # Check cache
    cache_key = f"tracks:{playlist_id}"
    cache = (
        db.query(YouTubeMusicCache)
        .filter_by(user_id=current_user.id, cache_key=cache_key)
        .first()
    )

    if cache and cache.expires_at > datetime.utcnow():
        return cache.cache_data

    try:
        # Decrypt token and get tracks
        access_token = youtube_service.decrypt_token(integration.encrypted_access_token)
        tracks = await youtube_service.get_playlist_tracks(access_token, playlist_id)

        # Update cache
        if cache:
            cache.cache_data = tracks
            cache.expires_at = datetime.utcnow() + timedelta(hours=1)
            cache.updated_at = datetime.utcnow()
        else:
            cache = YouTubeMusicCache(
                user_id=current_user.id,
                cache_key=cache_key,
                cache_data=tracks,
                expires_at=datetime.utcnow() + timedelta(hours=1),
            )
            db.add(cache)

        db.commit()

        return tracks

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_music(
    q: str = Query(..., description="Search query"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Search for music on YouTube"""
    # Get integration
    integration = (
        db.query(YouTubeMusicIntegration).filter_by(user_id=current_user.id).first()
    )

    if not integration or not integration.is_active:
        raise HTTPException(status_code=404, detail="YouTube Music not connected")

    try:
        # Decrypt token and search
        access_token = youtube_service.decrypt_token(integration.encrypted_access_token)
        results = await youtube_service.search_tracks(access_token, q)

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/track/{video_id}")
async def get_track_details(
    video_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Get detailed information about a track"""
    # Get integration
    integration = (
        db.query(YouTubeMusicIntegration).filter_by(user_id=current_user.id).first()
    )

    if not integration or not integration.is_active:
        raise HTTPException(status_code=404, detail="YouTube Music not connected")

    try:
        # Decrypt token and get video details
        access_token = youtube_service.decrypt_token(integration.encrypted_access_token)
        details = await youtube_service.get_video_details(access_token, video_id)

        # Check if we have sleep analysis for this track
        analysis = db.query(SleepMusicAnalysis).filter_by(video_id=video_id).first()

        if analysis:
            details["sleep_analysis"] = {
                "sleep_score": analysis.sleep_score,
                "tempo_bpm": analysis.tempo_bpm,
                "energy_level": analysis.energy_level,
                "recommended_sleep_stages": analysis.recommended_sleep_stages,
                "optimal_play_time": analysis.optimal_play_time,
                "warnings": analysis.warnings,
            }

        return details

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/playlist/create")
async def create_sleep_playlist(
    request: CreatePlaylistRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Create a new sleep playlist"""
    # Get integration
    integration = (
        db.query(YouTubeMusicIntegration).filter_by(user_id=current_user.id).first()
    )

    if not integration or not integration.is_active:
        raise HTTPException(status_code=404, detail="YouTube Music not connected")

    try:
        youtube_playlist_id = None

        # Create on YouTube if requested
        if request.sync_to_youtube:
            access_token = youtube_service.decrypt_token(
                integration.encrypted_access_token
            )
            youtube_playlist = await youtube_service.create_playlist(
                access_token, request.title, request.description, "private"
            )
            youtube_playlist_id = youtube_playlist["id"]

            # Add tracks to YouTube playlist
            for video_id in request.track_ids:
                await youtube_service.add_to_playlist(
                    access_token, youtube_playlist_id, video_id
                )

        # Create local playlist record
        playlist = UserSleepPlaylist(
            user_id=current_user.id,
            youtube_playlist_id=youtube_playlist_id,
            title=request.title,
            description=request.description,
            target_duration_minutes=request.target_duration_minutes,
            sleep_goal=request.sleep_goal,
            tracks=request.track_ids,
        )

        # Calculate total duration and average sleep score
        total_duration = 0
        total_score = 0
        score_count = 0

        for video_id in request.track_ids:
            analysis = db.query(SleepMusicAnalysis).filter_by(video_id=video_id).first()
            if analysis:
                total_duration += analysis.duration_seconds or 0
                total_score += analysis.sleep_score
                score_count += 1

        playlist.total_duration_seconds = total_duration
        if score_count > 0:
            playlist.average_sleep_score = total_score / score_count

        db.add(playlist)
        db.commit()

        return {
            "id": playlist.id,
            "title": playlist.title,
            "youtube_playlist_id": youtube_playlist_id,
            "track_count": len(request.track_ids),
            "total_duration_seconds": total_duration,
            "average_sleep_score": playlist.average_sleep_score,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/playlists/sleep", response_model=list[dict[str, Any]])
async def get_sleep_playlists(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[dict[str, Any]]:
    """Get user's sleep playlists"""
    playlists = db.query(UserSleepPlaylist).filter_by(user_id=current_user.id).all()

    result = []
    for playlist in playlists:
        result.append(
            {
                "id": playlist.id,
                "title": playlist.title,
                "description": playlist.description,
                "youtube_playlist_id": playlist.youtube_playlist_id,
                "target_duration_minutes": playlist.target_duration_minutes,
                "sleep_goal": playlist.sleep_goal,
                "track_count": len(playlist.tracks),
                "total_duration_seconds": playlist.total_duration_seconds,
                "average_sleep_score": playlist.average_sleep_score,
                "play_count": playlist.play_count,
                "last_played_at": playlist.last_played_at.isoformat()
                if playlist.last_played_at
                else None,
                "created_at": playlist.created_at.isoformat(),
            }
        )

    return result


@router.post("/session/start")
async def start_sleep_session(
    request: SleepSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Start a new sleep session"""
    # Create session record
    session = UserSleepSession(
        user_id=current_user.id,
        playlist_id=request.playlist_id,
        started_at=datetime.utcnow(),
    )

    db.add(session)

    # Update playlist play count
    if request.playlist_id:
        playlist = db.query(UserSleepPlaylist).filter_by(id=request.playlist_id).first()
        if playlist:
            playlist.play_count += 1
            playlist.last_played_at = datetime.utcnow()

    db.commit()

    return {
        "session_id": session.id,
        "started_at": session.started_at.isoformat(),
        "message": "Sleep session started successfully",
    }


@router.post("/session/{session_id}/end")
async def end_sleep_session(
    session_id: str,
    sleep_quality_rating: int | None = None,
    fall_asleep_time_minutes: int | None = None,
    wake_up_feeling: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """End a sleep session and record feedback"""
    session = (
        db.query(UserSleepSession)
        .filter_by(id=session_id, user_id=current_user.id)
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.ended_at = datetime.utcnow()
    session.sleep_quality_rating = sleep_quality_rating
    session.fall_asleep_time_minutes = fall_asleep_time_minutes
    session.wake_up_feeling = wake_up_feeling

    db.commit()

    return {
        "session_id": session.id,
        "duration_minutes": (session.ended_at - session.started_at).total_seconds()
        / 60,
        "sleep_quality_rating": sleep_quality_rating,
        "message": "Sleep session ended successfully",
    }
