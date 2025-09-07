from typing import Any

from pydantic import BaseModel, Field

from app.models.segment import SegmentType


class SegmentBase(BaseModel):
    """セグメント基本スキーマ"""

    time_sec: int = Field(..., ge=0)
    order: int = Field(..., ge=0)
    type: SegmentType
    content: dict[str, Any]
    duration_sec: int | None = None
    fade_in_sec: float = Field(default=0, ge=0)
    fade_out_sec: float = Field(default=0, ge=0)


class SegmentCreate(SegmentBase):
    """セグメント作成用スキーマ"""

    journey_id: int | None = None


class SegmentUpdate(BaseModel):
    """セグメント更新用スキーマ"""

    time_sec: int | None = None
    order: int | None = None
    content: dict[str, Any] | None = None
    fade_in_sec: float | None = None
    fade_out_sec: float | None = None


class SegmentResponse(SegmentBase):
    """セグメントレスポンススキーマ"""

    id: int
    journey_id: int

    class Config:
        from_attributes = True
