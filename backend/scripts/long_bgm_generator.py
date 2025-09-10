#!/usr/bin/env python3
"""
5分間BGM生成スクリプト

30秒セグメントを複数生成して5分間のBGMを作成
"""

import asyncio
import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import List, Optional

import numpy as np
import soundfile as sf

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
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class LongBGMGenerator:
    """長時間BGM生成器"""
    
    def __init__(self):
        """初期化"""
        self.generator = AudioCraftMusicGenerator()
        self.sample_rate = 32000
        
    async def generate_long_bgm(self, 
                               genre: MusicGenreEnum,
                               intensity: IntensityEnum,
                               total_duration: int = 300,  # 5分間
                               segment_duration: int = 30,
                               overlap_duration: int = 5,
                               output_filename: Optional[str] = None) -> str:
        """
        長時間BGMを生成
        
        Args:
            genre: 音楽ジャンル
            intensity: 強度
            total_duration: 総時間（秒）
            segment_duration: セグメント時間（秒）
            overlap_duration: オーバーラップ時間（秒）
            output_filename: 出力ファイル名
            
        Returns:
            生成されたファイルパス
        """
        if output_filename is None:
            output_filename = f"long_bgm_{genre.value}_{intensity.value}_{total_duration}s.wav"
        
        # セグメント数計算
        effective_segment_duration = segment_duration - overlap_duration
        num_segments = int(np.ceil(total_duration / effective_segment_duration))
        
        logger.info(f"Generating {total_duration}s BGM with {num_segments} segments")
        
        segments_audio = []
        
        for i in range(num_segments):
            logger.info(f"Generating segment {i+1}/{num_segments}")
            
            # リクエスト作成
            request = MusicGenerationRequest(
                genre=genre,
                intensity=intensity,
                duration=segment_duration,
                format=AudioFormatEnum.WAV
            )
            
            try:
                # セグメント生成
                track, audio_data = await self.generator.generate_music(request)
                
                # 音声データをNumPy配列に変換
                with tempfile.NamedTemporaryFile(suffix=".wav") as tmp_file:
                    tmp_file.write(audio_data)
                    tmp_file.flush()
                    
                    audio_array, _ = sf.read(tmp_file.name)
                
                segments_audio.append(audio_array)
                logger.info(f"✓ Segment {i+1} generated ({len(audio_array)} samples)")
                
            except Exception as e:
                logger.error(f"✗ Failed to generate segment {i+1}: {e}")
                raise
        
        # セグメントを繋げる（クロスフェード）
        logger.info("Stitching segments together...")
        combined_audio = self._stitch_segments(segments_audio, overlap_duration)
        
        # 指定時間にトリム
        target_samples = int(total_duration * self.sample_rate)
        if len(combined_audio) > target_samples:
            combined_audio = combined_audio[:target_samples]
        
        # ファイル保存
        output_path = Path(output_filename)
        sf.write(output_path, combined_audio, self.sample_rate, format='WAV', subtype='PCM_16')
        
        logger.info(f"🎵 Long BGM saved: {output_path} ({len(combined_audio)/self.sample_rate:.1f}s)")
        return str(output_path)
    
    def _stitch_segments(self, segments: List[np.ndarray], overlap_duration: int) -> np.ndarray:
        """
        セグメントをクロスフェードで繋げる
        
        Args:
            segments: 音声セグメント一覧
            overlap_duration: オーバーラップ時間（秒）
            
        Returns:
            結合された音声
        """
        if not segments:
            return np.array([])
        
        if len(segments) == 1:
            return segments[0]
        
        overlap_samples = int(overlap_duration * self.sample_rate)
        combined = segments[0].copy()
        
        for i in range(1, len(segments)):
            current_segment = segments[i]
            
            if len(combined) < overlap_samples or len(current_segment) < overlap_samples:
                # オーバーラップできない場合は単純結合
                combined = np.concatenate([combined, current_segment])
            else:
                # クロスフェード処理
                fade_out = np.linspace(1.0, 0.0, overlap_samples)
                fade_in = np.linspace(0.0, 1.0, overlap_samples)
                
                # 前セグメントの最後部分
                end_part = combined[-overlap_samples:] * fade_out
                # 現セグメントの最初部分
                start_part = current_segment[:overlap_samples] * fade_in
                
                # クロスフェード部分を作成
                crossfade = end_part + start_part
                
                # 結合
                combined = np.concatenate([
                    combined[:-overlap_samples],  # 前セグメント（オーバーラップ部分除く）
                    crossfade,                    # クロスフェード部分
                    current_segment[overlap_samples:]  # 現セグメント（オーバーラップ部分除く）
                ])
        
        return combined


async def main():
    """メイン実行関数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Long BGM Generator")
    parser.add_argument("--genre", default="sleep", 
                       choices=["sleep", "ambient", "meditation", "nature_sounds"],
                       help="Music genre")
    parser.add_argument("--intensity", default="low",
                       choices=["low", "medium", "high"],
                       help="Music intensity")
    parser.add_argument("--duration", type=int, default=300,
                       help="Total duration in seconds (default: 300s = 5 minutes)")
    parser.add_argument("--output", default=None,
                       help="Output filename")
    
    args = parser.parse_args()
    
    # Enum変換
    genre = MusicGenreEnum(args.genre)
    intensity = IntensityEnum(args.intensity)
    
    print(f"🎵 Generating {args.duration}s {genre.value} BGM ({intensity.value} intensity)")
    print(f"Using MusicGen-medium model...")
    print()
    
    generator = LongBGMGenerator()
    
    try:
        output_file = await generator.generate_long_bgm(
            genre=genre,
            intensity=intensity,
            total_duration=args.duration,
            output_filename=args.output
        )
        
        file_size_mb = Path(output_file).stat().st_size / (1024 * 1024)
        print(f"\n🎉 BGM generation completed!")
        print(f"📁 File: {output_file}")
        print(f"📊 Size: {file_size_mb:.1f} MB")
        print(f"⏱️  Duration: {args.duration}s ({args.duration/60:.1f} minutes)")
        
    except KeyboardInterrupt:
        print("\n⚠️ Generation interrupted by user")
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        print(f"\n❌ Generation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())