from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.orm import relationship
from app.db.database import Base


class Journey(Base):
    """睡眠ジャーニーモデル"""

    __tablename__ = "journeys"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    duration_sec = Column(Integer, nullable=False)  # 総時間（秒）
    thumbnail_url = Column(String(500))
    category = Column(String(50))  # nature, meditation, story等

    # メタデータ
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    play_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)

    # リレーション
    segments = relationship(
        "Segment", back_populates="journey", cascade="all, delete-orphan"
    )
