"""YouTube Music API routes - Phase 1 Simplified Implementation"""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/youtube-music", tags=["youtube-music"])


@router.get("/auth/url")
async def get_auth_url() -> dict[str, str]:
    """Get YouTube OAuth2 authorization URL - Phase 1 implementation"""
    return {
        "message": "Authentication required for YouTube Music integration",
        "auth_url": "https://accounts.google.com/oauth2/auth",
        "phase": "1",
        "note": "Full OAuth implementation coming in Phase 2",
    }


@router.get("/status")
async def get_integration_status() -> dict[str, Any]:
    """Check YouTube Music integration status - Phase 1 implementation"""
    return {
        "connected": False,
        "message": "YouTube Music integration is available but not connected",
        "phase": "1",
        "auth_required": True,
    }
