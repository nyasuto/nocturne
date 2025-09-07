from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, Enum as SQLEnum
from app.db.database import Base
import enum


class AudioCategory(str, enum.Enum):
    """音源カテゴリ"""

    NATURE = "nature"  # 自然音
    MUSIC = "music"  # 音楽
    NARRATION = "narration"  # ナレーション
    AMBIENT = "ambient"  # アンビエント
    WHITE_NOISE = "white_noise"  # ホワイトノイズ


class Audio(Base):
    """音源メタデータ"""

    __tablename__ = "audio_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), unique=True, nullable=False)
    display_name = Column(String(200), nullable=False)

    # メタデータ
    category = Column(SQLEnum(AudioCategory), nullable=False)
    duration_sec = Column(Integer)
    file_size_mb = Column(Float)

    # 追加情報
    tags = Column(JSON)  # ["relaxing", "ocean", "waves"]
    license = Column(String(100))  # "CC0", "Creative Commons", etc
    source = Column(String(200))  # "YouTube Audio Library"

    # 音声特性
    bpm = Column(Integer)  # 音楽の場合のBPM
    key = Column(String(10))  # 音楽の場合のキー

    created_at = Column(DateTime, default=datetime.utcnow)
    play_count = Column(Integer, default=0)
