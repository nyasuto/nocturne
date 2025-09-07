import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Audio, AudioCategory

router = APIRouter()

# 音源ファイルの保存ディレクトリ
AUDIO_DIR = Path("static/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/", response_model=list[dict])
async def get_audio_files(
    category: AudioCategory | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """音源ファイル一覧を取得"""
    query = db.query(Audio)

    if category:
        query = query.filter(Audio.category == category)

    audio_files = query.offset(skip).limit(limit).all()

    return [
        {
            "id": audio.id,
            "filename": audio.filename,
            "display_name": audio.display_name,
            "category": audio.category,
            "duration_sec": audio.duration_sec,
            "tags": audio.tags,
            "url": f"/api/v1/audio/stream/{audio.filename}",
        }
        for audio in audio_files
    ]


@router.get("/stream/{filename}")
async def stream_audio(filename: str):
    """音源ファイルをストリーミング"""
    file_path = AUDIO_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        headers={"Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600"},
    )


@router.post("/upload")
async def upload_audio(
    file: UploadFile = File(...),
    display_name: str = Query(...),
    category: AudioCategory = Query(...),
    tags: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """音源ファイルをアップロード"""
    # ファイル検証
    if not file.filename.endswith((".mp3", ".wav", ".ogg", ".m4a")):
        raise HTTPException(
            status_code=400, detail="Invalid file format. Supported: mp3, wav, ogg, m4a"
        )

    # ファイルサイズ制限（50MB）
    if file.size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=400, detail="File too large. Maximum size: 50MB"
        )

    # ファイル保存
    file_path = AUDIO_DIR / file.filename

    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # データベースに登録
        audio = Audio(
            filename=file.filename,
            display_name=display_name,
            category=category,
            file_size_mb=len(content) / (1024 * 1024),
            tags=tags.split(",") if tags else [],
        )

        db.add(audio)
        db.commit()
        db.refresh(audio)

        return {
            "message": "Audio uploaded successfully",
            "id": audio.id,
            "filename": audio.filename,
            "url": f"/api/v1/audio/stream/{audio.filename}",
        }

    except Exception as e:
        # エラー時はファイルを削除
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{audio_id}")
async def delete_audio(audio_id: int, db: Session = Depends(get_db)):
    """音源ファイルを削除"""
    audio = db.query(Audio).filter(Audio.id == audio_id).first()

    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")

    # ファイルを削除
    file_path = AUDIO_DIR / audio.filename
    if file_path.exists():
        os.remove(file_path)

    # データベースから削除
    db.delete(audio)
    db.commit()

    return {"message": "Audio deleted successfully"}
