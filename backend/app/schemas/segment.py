from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.segment import SegmentType


class SegmentBase(BaseModel):
    """セグメント基本スキーマ"""

    time_sec: int = Field(..., ge=0)
    order: int = Field(..., ge=0)
    type: SegmentType
    content: Dict[str, Any]
    duration_sec: Optional[int] = None
    fade_in_sec: float = Field(default=0, ge=0)
    fade_out_sec: float = Field(default=0, ge=0)


class SegmentCreate(SegmentBase):
    """セグメント作成用スキーマ"""

    journey_id: Optional[int] = None


class SegmentUpdate(BaseModel):
    """セグメント更新用スキーマ"""

    time_sec: Optional[int] = None
    order: Optional[int] = None
    content: Optional[Dict[str, Any]] = None
    fade_in_sec: Optional[float] = None
    fade_out_sec: Optional[float] = None


class SegmentResponse(SegmentBase):
    """セグメントレスポンススキーマ"""

    id: int
    journey_id: int

    class Config:
        from_attributes = True
