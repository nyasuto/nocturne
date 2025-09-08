from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Journey, Segment
from app.schemas.journey import (
    JourneyCreate,
    JourneyListResponse,
    JourneyResponse,
    JourneyUpdate,
)
from app.schemas.segment import SegmentCreate

router = APIRouter()


@router.get("/", response_model=list[JourneyListResponse])
async def get_journeys(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category: str | None = None,
    db: Session = Depends(get_db),
) -> list[JourneyListResponse]:
    """ジャーニー一覧を取得"""
    query = db.query(Journey)

    if category:
        query = query.filter(Journey.category == category)

    journeys = query.offset(skip).limit(limit).all()
    return journeys


@router.get("/featured", response_model=list[JourneyListResponse])
async def get_featured_journeys(db: Session = Depends(get_db)):
    """おすすめジャーニーを取得"""
    # 評価が高い順に取得
    journeys = db.query(Journey).order_by(Journey.rating.desc()).limit(6).all()
    return journeys


@router.get("/{journey_id}", response_model=JourneyResponse)
async def get_journey(journey_id: int, db: Session = Depends(get_db)):
    """特定のジャーニーを取得"""
    journey = db.query(Journey).filter(Journey.id == journey_id).first()

    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    # 再生回数をインクリメント
    journey.play_count += 1
    db.commit()

    return journey


@router.post("/", response_model=JourneyResponse, status_code=201)
async def create_journey(journey: JourneyCreate, db: Session = Depends(get_db)):
    """新しいジャーニーを作成"""
    db_journey = Journey(**journey.dict())
    db.add(db_journey)
    db.commit()
    db.refresh(db_journey)
    return db_journey


@router.put("/{journey_id}", response_model=JourneyResponse)
async def update_journey(
    journey_id: int, journey_update: JourneyUpdate, db: Session = Depends(get_db)
):
    """ジャーニーを更新"""
    journey = db.query(Journey).filter(Journey.id == journey_id).first()

    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    update_data = journey_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(journey, field, value)

    db.commit()
    db.refresh(journey)
    return journey


@router.delete("/{journey_id}")
async def delete_journey(journey_id: int, db: Session = Depends(get_db)):
    """ジャーニーを削除"""
    journey = db.query(Journey).filter(Journey.id == journey_id).first()

    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    db.delete(journey)
    db.commit()

    return {"message": "Journey deleted successfully"}


@router.post("/{journey_id}/segments", response_model=JourneyResponse, status_code=201)
async def add_segments(
    journey_id: int, segments: list[SegmentCreate], db: Session = Depends(get_db)
):
    """ジャーニーにセグメントを追加"""
    journey = db.query(Journey).filter(Journey.id == journey_id).first()

    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    for segment_data in segments:
        segment = Segment(
            journey_id=journey_id, **segment_data.dict(exclude={"journey_id"})
        )
        db.add(segment)

    db.commit()
    db.refresh(journey)
    return journey


@router.get("/categories", response_model=list[str])
async def get_categories(db: Session = Depends(get_db)):
    """利用可能なカテゴリ一覧を取得"""
    categories = (
        db.query(Journey.category).distinct().filter(Journey.category.isnot(None)).all()
    )
    return [cat[0] for cat in categories]
