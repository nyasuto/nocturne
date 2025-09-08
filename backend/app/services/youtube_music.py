"""YouTube Music integration service for personal use"""

import os
import uuid
from typing import Any

from cryptography.fernet import Fernet
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from ytmusicapi import YTMusic


class YouTubeMusicService:
    """YouTube Music API integration service"""

    def __init__(self):
        self.scopes = [
            "https://www.googleapis.com/auth/youtube.readonly",
        ]

        # OAuth2 configuration
        self.client_config = {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [
                    f"{os.getenv('BASE_URL', 'http://localhost:3000')}/api/v1/youtube/callback"
                ],
            }
        }

        # Encryption for token storage
        self.cipher_suite = None
        if os.getenv("ENCRYPTION_KEY"):
            self.cipher_suite = Fernet(os.getenv("ENCRYPTION_KEY").encode())

    async def get_auth_url(self, state: str = None) -> str:
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

    async def exchange_code_for_token(self, code: str) -> dict[str, Any]:
        """Exchange authorization code for access token"""
        flow = Flow.from_client_config(self.client_config, scopes=self.scopes)
        flow.redirect_uri = self.client_config["web"]["redirect_uris"][0]

        try:
            flow.fetch_token(code=code)
            credentials = flow.credentials

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

    async def get_youtube_service(self, access_token: str):
        """Get authenticated YouTube service instance"""
        credentials = Credentials(token=access_token)
        return build("youtube", "v3", credentials=credentials)

    async def get_user_playlists(self, access_token: str) -> list[dict[str, Any]]:
        """Get user's YouTube playlists"""
        try:
            service = await self.get_youtube_service(access_token)

            request = service.playlists().list(
                part="snippet,contentDetails", mine=True, maxResults=50
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

    async def get_playlist_tracks(
        self, access_token: str, playlist_id: str
    ) -> list[dict[str, Any]]:
        """Get tracks from a specific playlist"""
        try:
            service = await self.get_youtube_service(access_token)

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
                }
                tracks.append(track)

            # Sort by position in playlist
            tracks.sort(key=lambda x: x["position"])

            return tracks

        except HttpError as e:
            raise ValueError(f"Failed to get playlist tracks: {str(e)}")

    async def search_tracks(
        self, access_token: str, query: str, max_results: int = 25
    ) -> list[dict[str, Any]]:
        """Search for tracks on YouTube"""
        try:
            service = await self.get_youtube_service(access_token)

            request = service.search().list(
                part="snippet",
                q=query,
                type="video",
                videoCategoryId="10",  # Music category
                maxResults=max_results,
            )

            response = request.execute()

            tracks = []
            for item in response.get("items", []):
                snippet = item["snippet"]
                video_id = item["id"]["videoId"]

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
                }
                tracks.append(track)

            return tracks

        except HttpError as e:
            raise ValueError(f"Failed to search tracks: {str(e)}")

    async def get_video_details(
        self, access_token: str, video_id: str
    ) -> dict[str, Any]:
        """Get detailed information about a video"""
        try:
            service = await self.get_youtube_service(access_token)

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
            # Convert PT5M30S to seconds
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

    async def create_playlist(
        self,
        access_token: str,
        title: str,
        description: str = "",
        privacy_status: str = "private",
    ) -> dict[str, Any]:
        """Create a new playlist"""
        try:
            service = await self.get_youtube_service(access_token)

            request = service.playlists().insert(
                part="snippet,status",
                body={
                    "snippet": {
                        "title": title,
                        "description": description,
                        "defaultLanguage": "ja",
                    },
                    "status": {"privacyStatus": privacy_status},
                },
            )

            response = request.execute()

            return {
                "id": response["id"],
                "title": response["snippet"]["title"],
                "description": response["snippet"].get("description", ""),
                "privacy_status": response["status"]["privacyStatus"],
            }

        except HttpError as e:
            raise ValueError(f"Failed to create playlist: {str(e)}")

    async def add_to_playlist(
        self, access_token: str, playlist_id: str, video_id: str
    ) -> bool:
        """Add a video to a playlist"""
        try:
            service = await self.get_youtube_service(access_token)

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
