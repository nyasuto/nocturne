#!/usr/bin/env python3
"""
Nocturne バッチ音楽生成スクリプト

AudioCraftを使って睡眠・リラクゼーション音楽を事前生成し、
ファイルストックとして保存する
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# プロジェクトルートをパスに追加
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.schemas.ai_music import (
    AudioFormatEnum,
    IntensityEnum,
    MusicGenerationRequest,
    MusicGenreEnum,
)
from app.services.audiocraft_service import AudioCraftMusicGenerator

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('batch_generation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class BatchMusicGenerator:
    """バッチ音楽生成器"""
    
    def __init__(self, output_dir: str = "generated_music"):
        """
        初期化
        
        Args:
            output_dir: 出力ディレクトリ
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)
        
        # メタデータファイル
        self.metadata_file = self.output_dir / "metadata.json"
        self.metadata = self._load_metadata()
        
        # AudioCraft生成器
        self.generator = AudioCraftMusicGenerator()
        
        logger.info(f"BatchMusicGenerator initialized - Output: {self.output_dir}")
    
    def _load_metadata(self) -> Dict:
        """メタデータファイルをロード"""
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"tracks": [], "generation_stats": {}}
    
    def _save_metadata(self) -> None:
        """メタデータファイルを保存"""
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False, default=str)
    
    def _generate_filename(self, genre: MusicGenreEnum, intensity: IntensityEnum, 
                          duration: int, index: int = 1) -> str:
        """意味のあるファイル名を生成"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"nocturne_{genre.value}_{intensity.value}_{duration}s_{index:03d}_{timestamp}.wav"
    
    async def generate_track(self, genre: MusicGenreEnum, intensity: IntensityEnum,
                           duration: int = 30, custom_prompt: Optional[str] = None,
                           index: int = 1) -> Tuple[str, dict]:
        """
        単一トラックを生成
        
        Args:
            genre: 音楽ジャンル
            intensity: 強度
            duration: 長さ（秒）
            custom_prompt: カスタムプロンプト
            index: バリエーション番号
            
        Returns:
            ファイルパス, メタデータ
        """
        # リクエスト作成
        request = MusicGenerationRequest(
            genre=genre,
            intensity=intensity,
            duration=duration,
            prompt=custom_prompt,
            format=AudioFormatEnum.WAV
        )
        
        logger.info(f"Generating: {genre.value} - {intensity.value} - {duration}s (#{index})")
        
        try:
            # 音楽生成
            track, audio_data = await self.generator.generate_music(request)
            
            # ファイル名生成
            filename = self._generate_filename(genre, intensity, duration, index)
            filepath = self.output_dir / filename
            
            # ファイル保存
            with open(filepath, 'wb') as f:
                f.write(audio_data)
            
            # メタデータ準備
            metadata = {
                "filename": filename,
                "filepath": str(filepath),
                "genre": genre.value,
                "intensity": intensity.value,
                "duration": duration,
                "file_size": len(audio_data),
                "created_at": datetime.now().isoformat(),
                "model": track.metadata["model"],
                "prompt": track.metadata["prompt"],
                "index": index,
                "custom_prompt": custom_prompt
            }
            
            logger.info(f"✓ Generated: {filename} ({len(audio_data):,} bytes)")
            return str(filepath), metadata
            
        except Exception as e:
            logger.error(f"✗ Generation failed: {e}")
            raise
    
    async def generate_batch(self, 
                           genres: List[MusicGenreEnum] = None,
                           intensities: List[IntensityEnum] = None,
                           duration: int = 30,
                           variations_per_combo: int = 3) -> List[dict]:
        """
        バッチ生成実行
        
        Args:
            genres: 生成するジャンル一覧
            intensities: 生成する強度一覧  
            duration: 各トラックの長さ（秒）
            variations_per_combo: 各組み合わせのバリエーション数
            
        Returns:
            生成されたトラックのメタデータ一覧
        """
        # デフォルト設定
        if genres is None:
            genres = [MusicGenreEnum.SLEEP, MusicGenreEnum.AMBIENT, 
                     MusicGenreEnum.MEDITATION, MusicGenreEnum.NATURE_SOUNDS]
        
        if intensities is None:
            intensities = [IntensityEnum.LOW, IntensityEnum.MEDIUM]
        
        total_tracks = len(genres) * len(intensities) * variations_per_combo
        logger.info(f"Starting batch generation: {total_tracks} tracks")
        
        generated_tracks = []
        current_track = 0
        
        for genre in genres:
            for intensity in intensities:
                for variation in range(1, variations_per_combo + 1):
                    current_track += 1
                    logger.info(f"Progress: {current_track}/{total_tracks}")
                    
                    try:
                        filepath, metadata = await self.generate_track(
                            genre=genre,
                            intensity=intensity,
                            duration=duration,
                            index=variation
                        )
                        
                        # メタデータに追加
                        self.metadata["tracks"].append(metadata)
                        generated_tracks.append(metadata)
                        
                        # 途中保存（クラッシュ対策）
                        if current_track % 5 == 0:
                            self._save_metadata()
                            logger.info(f"Intermediate save completed ({current_track} tracks)")
                        
                    except Exception as e:
                        logger.error(f"Failed to generate track {current_track}: {e}")
                        continue
        
        # 最終保存
        self._save_metadata()
        
        # 統計更新
        self._update_generation_stats(len(generated_tracks))
        
        logger.info(f"Batch generation completed: {len(generated_tracks)} tracks generated")
        return generated_tracks
    
    def _update_generation_stats(self, new_tracks_count: int) -> None:
        """生成統計を更新"""
        stats = self.metadata.get("generation_stats", {})
        
        stats["last_generation"] = datetime.now().isoformat()
        stats["total_tracks"] = len(self.metadata["tracks"])
        stats["last_batch_count"] = new_tracks_count
        stats["total_batches"] = stats.get("total_batches", 0) + 1
        
        # 総ファイルサイズ計算
        total_size = sum(track.get("file_size", 0) for track in self.metadata["tracks"])
        stats["total_file_size_mb"] = round(total_size / 1024 / 1024, 2)
        
        self.metadata["generation_stats"] = stats
        self._save_metadata()
    
    def list_tracks(self) -> List[dict]:
        """生成済みトラック一覧を取得"""
        return self.metadata.get("tracks", [])
    
    def get_stats(self) -> dict:
        """生成統計を取得"""
        return self.metadata.get("generation_stats", {})
    
    def cleanup_old_tracks(self, max_age_days: int = 30) -> int:
        """古いトラックファイルをクリーンアップ"""
        from datetime import timedelta
        
        cutoff_date = datetime.now() - timedelta(days=max_age_days)
        removed_count = 0
        
        tracks_to_keep = []
        for track in self.metadata["tracks"]:
            created_at = datetime.fromisoformat(track["created_at"])
            if created_at > cutoff_date:
                tracks_to_keep.append(track)
            else:
                # ファイル削除
                filepath = Path(track["filepath"])
                if filepath.exists():
                    filepath.unlink()
                    logger.info(f"Removed old track: {track['filename']}")
                    removed_count += 1
        
        # メタデータ更新
        self.metadata["tracks"] = tracks_to_keep
        self._save_metadata()
        
        logger.info(f"Cleanup completed: {removed_count} old tracks removed")
        return removed_count


async def main():
    """メイン実行関数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Nocturne Batch Music Generator")
    parser.add_argument("--output-dir", default="generated_music", 
                       help="Output directory for generated music")
    parser.add_argument("--duration", type=int, default=30,
                       help="Duration of each track in seconds")
    parser.add_argument("--variations", type=int, default=3,
                       help="Number of variations per genre/intensity combo")
    parser.add_argument("--cleanup", action="store_true",
                       help="Cleanup old tracks (30+ days)")
    parser.add_argument("--stats", action="store_true",
                       help="Show generation statistics")
    
    args = parser.parse_args()
    
    # バッチ生成器初期化
    generator = BatchMusicGenerator(output_dir=args.output_dir)
    
    if args.cleanup:
        removed = generator.cleanup_old_tracks()
        print(f"Cleaned up {removed} old tracks")
        return
    
    if args.stats:
        stats = generator.get_stats()
        tracks = generator.list_tracks()
        
        print("\n=== Nocturne Music Generation Stats ===")
        print(f"Total tracks: {len(tracks)}")
        print(f"Total file size: {stats.get('total_file_size_mb', 0)} MB")
        print(f"Last generation: {stats.get('last_generation', 'Never')}")
        print(f"Total batches: {stats.get('total_batches', 0)}")
        
        # ジャンル別統計
        genre_counts = {}
        for track in tracks:
            genre = track.get('genre', 'unknown')
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
        
        print("\nGenre distribution:")
        for genre, count in sorted(genre_counts.items()):
            print(f"  {genre}: {count} tracks")
        
        return
    
    # バッチ生成実行
    try:
        print(f"\n🎵 Starting Nocturne Batch Music Generation")
        print(f"Output directory: {args.output_dir}")
        print(f"Track duration: {args.duration}s")
        print(f"Variations per combo: {args.variations}")
        print()
        
        tracks = await generator.generate_batch(
            duration=args.duration,
            variations_per_combo=args.variations
        )
        
        print(f"\n🎉 Batch generation completed!")
        print(f"Generated: {len(tracks)} tracks")
        print(f"Output: {args.output_dir}")
        
        # 統計表示
        stats = generator.get_stats()
        print(f"Total file size: {stats.get('total_file_size_mb', 0)} MB")
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Generation interrupted by user")
        print("Partial results saved to metadata.json")
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        print(f"\n❌ Generation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())