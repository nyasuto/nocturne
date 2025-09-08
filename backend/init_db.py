#!/usr/bin/env python3
"""データベース初期化スクリプト"""

import sys
from pathlib import Path

# プロジェクトルートをPythonパスに追加
sys.path.append(str(Path(__file__).parent))

from app.db.database import init_db, SessionLocal
from app.models import Journey, Segment, Audio, SegmentType, AudioCategory


def create_sample_data():
    """サンプルデータを作成"""
    db = SessionLocal()

    try:
        # 既存のデータを全て削除（クリーンな状態から開始）
        print("🗑️ Clearing existing data...")
        db.query(Segment).delete()
        db.query(Journey).delete() 
        db.query(Audio).delete()
        db.commit()
        print("✅ Existing data cleared")
        # サンプルジャーニー1: 森と川のせせらぎ
        journey1 = Journey(
            title="森と川のせせらぎ",
            description="深い森の中を流れる川のせせらぎと鳥のさえずりが、あなたを自然の眠りへと導きます",
            duration_sec=1800,  # 30分
            category="nature",
            rating=4.8,
        )
        db.add(journey1)
        db.commit()

        # セグメント追加
        segments1 = [
            Segment(
                journey_id=journey1.id,
                time_sec=0,
                order=0,
                type=SegmentType.NARRATION,
                content={
                    "text": "ゆっくりと目を閉じて、深呼吸をしましょう。今夜は深い森の中へ旅に出かけます。"
                },
                duration_sec=10,
            ),
            Segment(
                journey_id=journey1.id,
                time_sec=10,
                order=1,
                type=SegmentType.SFX,
                content={"audio_url": "forest.mp3", "gain": 0.8, "loop": True},
                fade_in_sec=3.0,
            ),
            Segment(
                journey_id=journey1.id,
                time_sec=30,
                order=2,
                type=SegmentType.SFX,
                content={"audio_url": "ocean.mp3", "gain": 0.7, "loop": True},
                fade_in_sec=5.0,
            ),
            Segment(
                journey_id=journey1.id,
                time_sec=120,
                order=3,
                type=SegmentType.MUSIC,
                content={"audio_url": "rain.mp3", "gain": 0.5, "loop": True},
                fade_in_sec=10.0,
            ),
        ]
        db.add_all(segments1)

        # サンプルジャーニー2: 静かな海辺の夜
        journey2 = Journey(
            title="静かな海辺の夜",
            description="穏やかな波の音と潮風が、心地よい眠りをもたらします",
            duration_sec=1800,
            category="nature",
            rating=4.7,
        )
        db.add(journey2)
        db.commit()

        # セグメント追加（ジャーニー2）
        segments2 = [
            Segment(
                journey_id=journey2.id,
                time_sec=0,
                order=0,
                type=SegmentType.NARRATION,
                content={
                    "text": "穏やかな海辺で、波の音を聞きながらリラックスしましょう。"
                },
                duration_sec=10,
            ),
            Segment(
                journey_id=journey2.id,
                time_sec=10,
                order=1,
                type=SegmentType.SFX,
                content={"audio_url": "ocean.mp3", "gain": 0.8, "loop": True},
                fade_in_sec=5.0,
            ),
        ]
        db.add_all(segments2)

        # サンプルジャーニー3: 星空の瞑想
        journey3 = Journey(
            title="星空の瞑想",
            description="静寂の中で響く宇宙の音が、深い瞑想状態へと導きます",
            duration_sec=1200,  # 20分
            category="meditation",
            rating=4.9,
        )
        db.add(journey3)
        db.commit()

        # セグメント追加（ジャーニー3）
        segments3 = [
            Segment(
                journey_id=journey3.id,
                time_sec=0,
                order=0,
                type=SegmentType.NARRATION,
                content={"text": "星空を見上げながら、宇宙の静寂に身を委ねましょう。"},
                duration_sec=10,
            ),
            Segment(
                journey_id=journey3.id,
                time_sec=10,
                order=1,
                type=SegmentType.MUSIC,
                content={"audio_url": "silence.mp3", "gain": 0.3, "loop": True},
                fade_in_sec=10.0,
            ),
        ]
        db.add_all(segments3)

        # サンプル音源データ
        audio_samples = [
            Audio(
                filename="forest_ambience.mp3",
                display_name="森の環境音",
                category=AudioCategory.NATURE,
                duration_sec=300,
                file_size_mb=5.2,
                tags=["forest", "birds", "nature"],
                license="CC0",
            ),
            Audio(
                filename="river_stream.mp3",
                display_name="川のせせらぎ",
                category=AudioCategory.NATURE,
                duration_sec=300,
                file_size_mb=4.8,
                tags=["river", "water", "stream"],
                license="CC0",
            ),
            Audio(
                filename="peaceful_piano.mp3",
                display_name="穏やかなピアノ",
                category=AudioCategory.MUSIC,
                duration_sec=240,
                file_size_mb=3.5,
                tags=["piano", "peaceful", "relaxing"],
                license="CC0",
            ),
            Audio(
                filename="ocean_waves.mp3",
                display_name="海の波音",
                category=AudioCategory.NATURE,
                duration_sec=300,
                file_size_mb=5.0,
                tags=["ocean", "waves", "sea"],
                license="CC0",
            ),
        ]
        db.add_all(audio_samples)

        db.commit()
        print("✅ Sample data created successfully!")

    except Exception as e:
        print(f"❌ Error creating sample data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("🌙 Initializing Nocturne database...")

    # データベース初期化
    init_db()

    # サンプルデータ作成
    create_sample_data()

    print("✨ Database initialization complete!")
