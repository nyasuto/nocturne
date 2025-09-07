import enum

from sqlalchemy import JSON, Column, Float, ForeignKey, Integer
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.db.database import Base


class SegmentType(str, enum.Enum):
    """セグメントのタイプ"""

    NARRATION = "narration"  # ナレーション
    MUSIC = "music"  # BGM
    SFX = "sfx"  # 効果音・環境音
    ACTION = "action"  # アクション（フェード等）


class Segment(Base):
    """ジャーニーの個別セグメント"""

    __tablename__ = "segments"

    id = Column(Integer, primary_key=True, index=True)
    journey_id = Column(Integer, ForeignKey("journeys.id", ondelete="CASCADE"))

    # タイミング
    time_sec = Column(Integer, nullable=False)  # 開始時刻（秒）
    order = Column(Integer, nullable=False)  # 実行順序

    # セグメント情報
    type = Column(SQLEnum(SegmentType), nullable=False)
    content = Column(
        JSON
    )  # {"text": "...", "audio_url": "...", "gain": 0.5, "loop": true, etc}

    # 音声設定
    duration_sec = Column(Integer)  # このセグメントの長さ（秒）
    fade_in_sec = Column(Float, default=0)
    fade_out_sec = Column(Float, default=0)

    # リレーション
    journey = relationship("Journey", back_populates="segments")
