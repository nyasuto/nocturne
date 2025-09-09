"""YouTube Music integration service for personal use"""

import os
import uuid
from typing import Any

from cryptography.fernet import Fernet
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from ytmusicapi import YTMusic


class YouTubeMusicService:
    """YouTube Music API integration service - Phase 2 implementation"""

    def __init__(self):
        self.scopes = [
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/youtube",
        ]

        # OAuth2 configuration
        self.client_config = {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [
                    f"{os.getenv('BACKEND_URL', 'http://localhost:8000')}/api/v1/youtube-music/auth/callback"
                ],
            }
        }

        # Encryption for token storage
        self.cipher_suite = None
        if os.getenv("ENCRYPTION_KEY"):
            self.cipher_suite = Fernet(os.getenv("ENCRYPTION_KEY").encode())

        # In-memory storage for Phase 2 (would use database in production)
        self._credentials = None
        self._youtube_service = None

    def get_auth_url(self, state: str = None) -> str:
        """Generate OAuth2 authorization URL"""
        flow = Flow.from_client_config(self.client_config, scopes=self.scopes)
        flow.redirect_uri = self.client_config["web"]["redirect_uris"][0]

        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            state=state or str(uuid.uuid4()),
            prompt="consent",
        )

        return auth_url

    def exchange_code_for_token(self, code: str) -> dict[str, Any]:
        """Exchange authorization code for access token"""
        flow = Flow.from_client_config(self.client_config, scopes=self.scopes)
        flow.redirect_uri = self.client_config["web"]["redirect_uris"][0]

        try:
            flow.fetch_token(code=code)
            credentials = flow.credentials

            # Store credentials in memory for Phase 2
            self._credentials = credentials
            self._youtube_service = build("youtube", "v3", credentials=credentials)

            return {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "expires_at": credentials.expiry.isoformat()
                if credentials.expiry
                else None,
                "scopes": credentials.scopes,
            }
        except Exception as e:
            raise ValueError(f"Failed to exchange code for token: {str(e)}")

    def encrypt_token(self, token: str) -> str:
        """Encrypt token for secure storage"""
        if not self.cipher_suite:
            raise ValueError("Encryption key not configured")
        return self.cipher_suite.encrypt(token.encode()).decode()

    def decrypt_token(self, encrypted_token: str) -> str:
        """Decrypt stored token"""
        if not self.cipher_suite:
            raise ValueError("Encryption key not configured")
        return self.cipher_suite.decrypt(encrypted_token.encode()).decode()

    def get_youtube_service(self):
        """Get authenticated YouTube service instance"""
        if not self._youtube_service:
            raise ValueError("YouTube service not authenticated")
        return self._youtube_service

    def is_authenticated(self) -> bool:
        """Check if user is authenticated"""
        return self._credentials is not None and self._youtube_service is not None

    def disconnect(self):
        """Disconnect YouTube Music integration"""
        self._credentials = None
        self._youtube_service = None

    def get_user_playlists(self) -> list[dict[str, Any]]:
        """Get user's YouTube playlists"""
        if not self.is_authenticated():
            raise ValueError("Not authenticated")

        try:
            service = self.get_youtube_service()

            request = service.playlists().list(
                part="snippet,contentDetails,status", mine=True, maxResults=50
            )

            response = request.execute()

            playlists = []
            for item in response.get("items", []):
                playlist = {
                    "id": item["id"],
                    "title": item["snippet"]["title"],
                    "description": item["snippet"].get("description", ""),
                    "thumbnail_url": item["snippet"]["thumbnails"]["default"]["url"]
                    if "thumbnails" in item["snippet"]
                    else None,
                    "track_count": item["contentDetails"]["itemCount"],
                    "privacy_status": item.get("status", {}).get(
                        "privacyStatus", "private"
                    ),
                }
                playlists.append(playlist)

            return playlists

        except HttpError as e:
            raise ValueError(f"Failed to get playlists: {str(e)}")

    def get_playlist_tracks(self, playlist_id: str) -> list[dict[str, Any]]:
        """Get tracks from a specific playlist"""
        if not self.is_authenticated():
            raise ValueError("Not authenticated")

        try:
            service = self.get_youtube_service()

            request = service.playlistItems().list(
                part="snippet,contentDetails", playlistId=playlist_id, maxResults=50
            )

            response = request.execute()

            tracks = []
            for item in response.get("items", []):
                snippet = item["snippet"]

                # Extract video ID and details
                video_id = snippet["resourceId"]["videoId"]

                track = {
                    "id": video_id,
                    "title": snippet["title"],
                    "artist": snippet.get("videoOwnerChannelTitle", "Unknown Artist"),
                    "thumbnail_url": snippet["thumbnails"]["default"]["url"]
                    if "thumbnails" in snippet
                    else None,
                    "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
                    "position": snippet["position"],
                    "added_at": snippet.get("publishedAt", ""),
                    "sleep_score": self._calculate_sleep_score(
                        snippet["title"], snippet.get("description", "")
                    ),
                }
                tracks.append(track)

            # Sort by position in playlist
            tracks.sort(key=lambda x: x["position"])

            return tracks

        except HttpError as e:
            raise ValueError(f"Failed to get playlist tracks: {str(e)}")

    def search_tracks(
        self, query: str, limit: int = 25, filter: str = None
    ) -> list[dict[str, Any]]:
        """Search for tracks on YouTube"""
        if not self.is_authenticated():
            raise ValueError("Not authenticated")

        try:
            service = self.get_youtube_service()

            # Enhance query for sleep-focused content
            sleep_keywords = [
                "sleep",
                "relaxing",
                "ambient",
                "meditation",
                "calming",
                "peaceful",
            ]
            if filter == "sleep" and not any(
                keyword in query.lower() for keyword in sleep_keywords
            ):
                query = f"{query} relaxing sleep music"

            request = service.search().list(
                part="snippet",
                q=query,
                type="video",
                videoCategoryId="10",  # Music category
                maxResults=limit,
                order="relevance",
            )

            response = request.execute()

            tracks = []
            for item in response.get("items", []):
                snippet = item["snippet"]
                video_id = item["id"]["videoId"]

                sleep_score = self._calculate_sleep_score(
                    snippet["title"], snippet.get("description", "")
                )

                track = {
                    "id": video_id,
                    "title": snippet["title"],
                    "artist": snippet.get("channelTitle", "Unknown Artist"),
                    "description": snippet.get("description", ""),
                    "thumbnail_url": snippet["thumbnails"]["default"]["url"]
                    if "thumbnails" in snippet
                    else None,
                    "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
                    "published_at": snippet.get("publishedAt", ""),
                    "sleep_score": sleep_score,
                }
                tracks.append(track)

            # Sort by sleep score if filtering for sleep content
            if filter == "sleep":
                tracks.sort(key=lambda x: x["sleep_score"], reverse=True)

            return tracks

        except HttpError as e:
            raise ValueError(f"Failed to search tracks: {str(e)}")

    def get_video_details(self, video_id: str) -> dict[str, Any]:
        """Get detailed information about a video"""
        if not self.is_authenticated():
            raise ValueError("Not authenticated")

        try:
            service = self.get_youtube_service()

            request = service.videos().list(
                part="snippet,contentDetails,statistics", id=video_id
            )

            response = request.execute()

            if not response.get("items"):
                raise ValueError(f"Video not found: {video_id}")

            item = response["items"][0]
            snippet = item["snippet"]
            content_details = item["contentDetails"]
            statistics = item.get("statistics", {})

            # Parse duration (ISO 8601 format)
            duration = content_details["duration"]
            import re

            match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration)
            if match:
                hours = int(match.group(1) or 0)
                minutes = int(match.group(2) or 0)
                seconds = int(match.group(3) or 0)
                duration_seconds = hours * 3600 + minutes * 60 + seconds
            else:
                duration_seconds = 0

            return {
                "id": video_id,
                "title": snippet["title"],
                "artist": snippet.get("channelTitle", "Unknown Artist"),
                "description": snippet.get("description", ""),
                "thumbnail_url": snippet["thumbnails"]["high"]["url"]
                if "thumbnails" in snippet
                else None,
                "youtube_url": f"https://www.youtube.com/watch?v={video_id}",
                "duration_seconds": duration_seconds,
                "view_count": int(statistics.get("viewCount", 0)),
                "like_count": int(statistics.get("likeCount", 0)),
                "tags": snippet.get("tags", []),
                "category_id": snippet.get("categoryId", ""),
                "published_at": snippet.get("publishedAt", ""),
            }

        except HttpError as e:
            raise ValueError(f"Failed to get video details: {str(e)}")

    def create_sleep_playlist(self, playlist_data: dict[str, Any]) -> dict[str, Any]:
        """Create a new sleep playlist"""
        if not self.is_authenticated():
            raise ValueError("Not authenticated")

        try:
            service = self.get_youtube_service()

            title = playlist_data["title"]
            description = playlist_data.get("description", "")
            track_ids = playlist_data.get("track_ids", [])

            # Create playlist
            request = service.playlists().insert(
                part="snippet,status",
                body={
                    "snippet": {
                        "title": title,
                        "description": description,
                        "defaultLanguage": "ja",
                    },
                    "status": {"privacyStatus": "private"},
                },
            )

            response = request.execute()
            playlist_id = response["id"]

            # Add tracks to playlist
            for track_id in track_ids:
                self._add_to_playlist(playlist_id, track_id)

            return {
                "id": playlist_id,
                "title": response["snippet"]["title"],
                "description": response["snippet"].get("description", ""),
                "privacy_status": response["status"]["privacyStatus"],
                "track_count": len(track_ids),
                "target_duration_minutes": playlist_data.get("target_duration_minutes"),
                "sleep_goal": playlist_data.get("sleep_goal"),
            }

        except HttpError as e:
            raise ValueError(f"Failed to create playlist: {str(e)}")

    def _add_to_playlist(self, playlist_id: str, video_id: str) -> bool:
        """Add a video to a playlist (internal method)"""
        try:
            service = self.get_youtube_service()

            request = service.playlistItems().insert(
                part="snippet",
                body={
                    "snippet": {
                        "playlistId": playlist_id,
                        "resourceId": {"kind": "youtube#video", "videoId": video_id},
                    }
                },
            )

            request.execute()
            return True

        except HttpError as e:
            raise ValueError(f"Failed to add to playlist: {str(e)}")

    def analyze_sleep_suitability(
        self, track_details: dict[str, Any]
    ) -> dict[str, Any]:
        """Analyze track suitability for sleep"""
        title = track_details.get("title", "")
        description = track_details.get("description", "")
        duration = track_details.get("duration_seconds", 0)
        tags = track_details.get("tags", [])

        sleep_score = self._calculate_sleep_score(title, description)

        # Duration analysis
        duration_score = 85  # Base score
        if duration > 0:
            if 180 <= duration <= 600:  # 3-10 minutes is ideal
                duration_score = 95
            elif duration > 600:  # Too long
                duration_score = max(60, 95 - (duration - 600) // 60)
            elif duration < 180:  # Too short
                duration_score = max(70, 95 - (180 - duration) // 30)

        # Tag analysis
        sleep_tags = [
            "sleep",
            "relaxing",
            "meditation",
            "ambient",
            "calm",
            "peaceful",
            "nature",
        ]
        tag_bonus = sum(
            5
            for tag in tags
            if any(sleep_tag in tag.lower() for sleep_tag in sleep_tags)
        )

        final_score = min(100, (sleep_score + duration_score + tag_bonus) // 2)

        return {
            "overall_score": final_score,
            "content_score": sleep_score,
            "duration_score": duration_score,
            "duration_minutes": duration // 60,
            "recommendations": self._get_sleep_recommendations(final_score, duration),
        }

    def _calculate_sleep_score(self, title: str, description: str) -> int:
        """Calculate sleep suitability score based on content"""
        text = f"{title.lower()} {description.lower()}"

        # Positive sleep indicators
        positive_keywords = {
            "sleep": 20,
            "relaxing": 15,
            "calm": 15,
            "peaceful": 15,
            "ambient": 12,
            "meditation": 12,
            "nature": 10,
            "rain": 10,
            "ocean": 10,
            "forest": 10,
            "piano": 8,
            "soft": 8,
            "gentle": 8,
            "soothing": 8,
            "tranquil": 8,
            "serene": 8,
            "quiet": 6,
            "slow": 6,
            "deep": 6,
            "night": 6,
        }

        # Negative sleep indicators
        negative_keywords = {
            "energetic": -15,
            "upbeat": -15,
            "fast": -12,
            "loud": -12,
            "party": -10,
            "dance": -10,
            "rock": -8,
            "metal": -8,
            "pop": -5,
            "bright": -5,
            "exciting": -8,
            "intense": -8,
        }

        score = 50  # Base score

        # Add positive points
        for keyword, points in positive_keywords.items():
            if keyword in text:
                score += points

        # Subtract negative points
        for keyword, points in negative_keywords.items():
            if keyword in text:
                score += points  # points are already negative

        return max(0, min(100, score))

    def _get_sleep_recommendations(self, score: int, duration: int) -> list[str]:
        """Get recommendations based on sleep analysis"""
        recommendations = []

        if score >= 85:
            recommendations.append("優秀な睡眠用トラックです")
        elif score >= 70:
            recommendations.append("睡眠に適したトラックです")
        elif score >= 50:
            recommendations.append(
                "リラックスには適していますが、睡眠には最適ではありません"
            )
        else:
            recommendations.append("このトラックは睡眠には適していません")

        if duration > 600:  # 10+ minutes
            recommendations.append("長時間のトラックです。睡眠導入に適しています")
        elif duration < 180:  # < 3 minutes
            recommendations.append(
                "短いトラックです。プレイリストに複数追加することをお勧めします"
            )

        return recommendations


class YTMusicPersonalService:
    """YTMusic API service for personal use (advanced features)"""

    def __init__(self, auth_file_path: str = None):
        self.auth_file = auth_file_path or "ytmusic_auth.json"
        self.ytmusic = None

        if os.path.exists(self.auth_file):
            self.ytmusic = YTMusic(self.auth_file)

    async def setup_oauth(self) -> str:
        """Setup OAuth for YTMusic (one-time setup)"""
        try:
            YTMusic.setup(filepath=self.auth_file)
            self.ytmusic = YTMusic(self.auth_file)
            return "OAuth setup completed successfully"
        except Exception as e:
            raise ValueError(f"Failed to setup YTMusic OAuth: {str(e)}")

    async def get_library_songs(self) -> list[dict[str, Any]]:
        """Get user's library songs"""
        if not self.ytmusic:
            raise ValueError("YTMusic not authenticated")

        try:
            songs = self.ytmusic.get_library_songs(limit=100)
            return songs
        except Exception as e:
            raise ValueError(f"Failed to get library songs: {str(e)}")

    async def get_song_info(self, video_id: str) -> dict[str, Any]:
        """Get detailed song information including audio features"""
        if not self.ytmusic:
            raise ValueError("YTMusic not authenticated")

        try:
            song = self.ytmusic.get_song(video_id)

            # Extract useful information for sleep analysis
            return {
                "video_id": video_id,
                "title": song.get("videoDetails", {}).get("title", ""),
                "artist": song.get("videoDetails", {}).get("author", ""),
                "duration": song.get("videoDetails", {}).get("lengthSeconds", 0),
                "category": song.get("videoDetails", {}).get("category", ""),
                "is_music": song.get("videoDetails", {}).get("isMusicVideo", False),
                "streaming_data": song.get("streamingData", {}),
            }
        except Exception as e:
            raise ValueError(f"Failed to get song info: {str(e)}")

    async def search_music(
        self, query: str, filter: str = None
    ) -> list[dict[str, Any]]:
        """Search for music with advanced filters"""
        if not self.ytmusic:
            raise ValueError("YTMusic not authenticated")

        try:
            results = self.ytmusic.search(query, filter=filter)
            return results
        except Exception as e:
            raise ValueError(f"Failed to search music: {str(e)}")
