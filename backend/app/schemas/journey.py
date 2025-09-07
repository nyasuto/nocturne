from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.segment import SegmentResponse


class JourneyBase(BaseModel):
    """ジャーニー基本スキーマ"""

    title: str = Field(..., max_length=200)
    description: str | None = None
    duration_sec: int = Field(..., gt=0)
    thumbnail_url: str | None = None
    category: str | None = None


class JourneyCreate(JourneyBase):
    """ジャーニー作成用スキーマ"""

    pass


class JourneyUpdate(BaseModel):
    """ジャーニー更新用スキーマ"""

    title: str | None = None
    description: str | None = None
    thumbnail_url: str | None = None
    category: str | None = None


class JourneyResponse(JourneyBase):
    """ジャーニーレスポンススキーマ"""

    id: int
    created_at: datetime
    updated_at: datetime
    play_count: int
    rating: float
    segments: list[SegmentResponse] = []

    class Config:
        from_attributes = True


class JourneyListResponse(BaseModel):
    """ジャーニー一覧レスポンススキーマ"""

    id: int
    title: str
    description: str | None
    duration_sec: int
    thumbnail_url: str | None
    category: str | None
    play_count: int
    rating: float

    class Config:
        from_attributes = True
