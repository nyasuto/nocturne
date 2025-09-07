from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.segment import SegmentResponse


class JourneyBase(BaseModel):
    """ジャーニー基本スキーマ"""

    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    duration_sec: int = Field(..., gt=0)
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None


class JourneyCreate(JourneyBase):
    """ジャーニー作成用スキーマ"""

    pass


class JourneyUpdate(BaseModel):
    """ジャーニー更新用スキーマ"""

    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None


class JourneyResponse(JourneyBase):
    """ジャーニーレスポンススキーマ"""

    id: int
    created_at: datetime
    updated_at: datetime
    play_count: int
    rating: float
    segments: List[SegmentResponse] = []

    class Config:
        from_attributes = True


class JourneyListResponse(BaseModel):
    """ジャーニー一覧レスポンススキーマ"""

    id: int
    title: str
    description: Optional[str]
    duration_sec: int
    thumbnail_url: Optional[str]
    category: Optional[str]
    play_count: int
    rating: float

    class Config:
        from_attributes = True
