from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import audio, journeys
from app.core.config import settings
from app.db.database import init_db
from app.routers import youtube_music

# FastAPIアプリケーションの作成
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ルートエンドポイント
@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "healthy",
        "message": "Welcome to Nocturne API",
    }


# ヘルスチェック
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# APIルーターの登録
app.include_router(
    journeys.router, prefix=f"{settings.API_PREFIX}/journeys", tags=["journeys"]
)

app.include_router(audio.router, prefix=f"{settings.API_PREFIX}/audio", tags=["audio"])

# YouTube Music API routes
app.include_router(youtube_music.router)


# エラーハンドラー
@app.exception_handler(404)
async def not_found_handler(_request, _exc):
    return JSONResponse(status_code=404, content={"detail": "Resource not found"})


@app.exception_handler(500)
async def internal_error_handler(_request, _exc):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# 起動時の処理
@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の処理"""
    print(f"🌙 {settings.PROJECT_NAME} v{settings.VERSION} starting...")
    print(f"📝 Environment: {settings.ENV}")
    print(f"🔗 API docs: http://localhost:8000{settings.API_PREFIX}/docs")

    # データベース初期化（開発環境のみ）
    if settings.ENV == "development":
        init_db()


# シャットダウン時の処理
@app.on_event("shutdown")
async def shutdown_event():
    """アプリケーション終了時の処理"""
    print(f"🌙 {settings.PROJECT_NAME} shutting down...")
