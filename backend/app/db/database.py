from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings


# SQLite用の設定
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},  # SQLiteのみ必要
        echo=settings.ENV == "development",
    )
else:
    # PostgreSQL等の場合
    engine = create_engine(settings.DATABASE_URL, echo=settings.ENV == "development")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """全モデルの基底クラス"""

    pass


def get_db():
    """データベースセッションの依存性注入用"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """データベース初期化"""
    from app.models import journey, segment, audio  # 循環インポート回避

    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
