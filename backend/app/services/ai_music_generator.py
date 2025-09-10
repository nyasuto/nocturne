"""
AI音楽生成サービス

段階的導入戦略に基づいて複数の音楽生成手法をサポート：
1. Web Audio API ベース（フロントエンド生成）
2. プログラマブル音楽生成（算術ベース）
3. Mubert API 統合（将来）
"""

import io
import math
import random
import struct
import uuid
import wave
from datetime import datetime

from app.schemas.ai_music import (
    AudioFormatEnum,
    GeneratedTrack,
    IntensityEnum,
    MusicGenerationRequest,
    MusicGenerationResponse,
    MusicGenreEnum,
)
from app.services.audio_cache import audio_cache
from app.services.audiocraft_service import audiocraft_generator


class ProgrammaticMusicGenerator:
    """プログラマブル音楽生成器（算術ベース）"""

    def __init__(self):
        """初期化"""
        self.sample_rate = 44100
        self.channels = 2  # ステレオ

    def generate_sine_wave(
        self, frequency: float, duration: float, amplitude: float = 0.3
    ) -> list[float]:
        """
        サイン波を生成

        Args:
            frequency: 周波数（Hz）
            duration: 継続時間（秒）
            amplitude: 振幅（0.0-1.0）

        Returns:
            サンプルデータのリスト
        """
        samples = []
        num_samples = int(self.sample_rate * duration)

        for i in range(num_samples):
            t = i / self.sample_rate
            sample = amplitude * math.sin(2 * math.pi * frequency * t)
            samples.append(sample)

        return samples

    def generate_brown_noise(
        self, duration: float, amplitude: float = 0.1
    ) -> list[float]:
        """
        ブラウンノイズを生成（低周波中心のホワイトノイズ）

        Args:
            duration: 継続時間（秒）
            amplitude: 振幅

        Returns:
            サンプルデータのリスト
        """
        samples = []
        num_samples = int(self.sample_rate * duration)
        brown_value = 0.0

        for _ in range(num_samples):
            white_noise = random.uniform(-1.0, 1.0)
            brown_value = (brown_value + white_noise * 0.02) % 1.0
            samples.append(brown_value * amplitude)

        return samples

    def apply_fade(
        self, samples: list[float], fade_duration: float = 5.0
    ) -> list[float]:
        """
        フェードイン・フェードアウトを適用

        Args:
            samples: オーディオサンプル
            fade_duration: フェード時間（秒）

        Returns:
            フェード処理済みサンプル
        """
        fade_samples = int(self.sample_rate * fade_duration)
        result = samples[:]

        # フェードイン
        for i in range(min(fade_samples, len(result))):
            fade_factor = i / fade_samples
            result[i] *= fade_factor

        # フェードアウト
        start_fadeout = len(result) - fade_samples
        for i in range(max(0, start_fadeout), len(result)):
            fade_factor = (len(result) - i) / fade_samples
            result[i] *= fade_factor

        return result

    def mix_tracks(
        self, track_list: list[list[float]], volumes: list[float] | None = None
    ) -> list[float]:
        """
        複数のトラックをミックス

        Args:
            track_list: トラックのリスト
            volumes: 各トラックの音量（0.0-1.0）

        Returns:
            ミックスされたサンプル
        """
        if not track_list:
            return []

        if volumes is None:
            volumes = [1.0] * len(track_list)

        max_length = max(len(track) for track in track_list)
        mixed = [0.0] * max_length

        for i, track in enumerate(track_list):
            volume = volumes[i] if i < len(volumes) else 1.0
            for j, sample in enumerate(track):
                if j < max_length:
                    mixed[j] += sample * volume

        # クリッピング防止
        max_val = max(abs(s) for s in mixed) if mixed else 1.0
        if max_val > 1.0:
            mixed = [s / max_val for s in mixed]

        return mixed

    def samples_to_wav(self, samples: list[float]) -> bytes:
        """
        サンプルデータをWAVファイルに変換

        Args:
            samples: サンプルデータ

        Returns:
            WAVファイルのバイトデータ
        """
        buffer = io.BytesIO()

        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(self.channels)
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(self.sample_rate)

            # ステレオ対応：モノラルサンプルを左右チャンネルに複製
            stereo_samples = []
            for sample in samples:
                # 16-bit PCM に変換
                pcm_sample = int(sample * 32767)
                pcm_sample = max(-32768, min(32767, pcm_sample))
                stereo_samples.extend([pcm_sample, pcm_sample])  # L, R

            # バイト配列に変換
            wav_data = struct.pack("<" + "h" * len(stereo_samples), *stereo_samples)
            wav_file.writeframes(wav_data)

        buffer.seek(0)
        return buffer.read()


class AIMusicGenerator:
    """AI音楽生成サービス"""

    def __init__(self):
        """初期化"""
        self.programmatic_generator = ProgrammaticMusicGenerator()

        # ジャンル別生成パラメータ
        self.genre_configs = {
            MusicGenreEnum.SLEEP: {
                "base_frequencies": [40, 60, 80, 110],  # 低周波
                "harmonics": [220, 440, 880],
                "noise_mix": 0.3,
                "tempo": 60,  # BPM
            },
            MusicGenreEnum.AMBIENT: {
                "base_frequencies": [55, 110, 220],
                "harmonics": [330, 660, 1320],
                "noise_mix": 0.2,
                "tempo": 80,
            },
            MusicGenreEnum.WHITE_NOISE: {
                "base_frequencies": [],
                "harmonics": [],
                "noise_mix": 1.0,
                "tempo": 0,
            },
            MusicGenreEnum.NATURE_SOUNDS: {
                "base_frequencies": [200, 400, 800],
                "harmonics": [1600, 3200],
                "noise_mix": 0.8,
                "tempo": 0,
            },
            MusicGenreEnum.MEDITATION: {
                "base_frequencies": [256, 432, 528],  # ヒーリング周波数
                "harmonics": [864, 1728],
                "noise_mix": 0.1,
                "tempo": 40,
            },
        }

    async def generate_music(
        self, request: MusicGenerationRequest
    ) -> MusicGenerationResponse:
        """
        音楽を生成

        Args:
            request: 音楽生成リクエスト

        Returns:
            生成結果
        """
        try:
            # キャッシュチェック
            generation_params = {
                "genre": request.genre.value,
                "duration": request.duration,
                "intensity": request.intensity.value,
                "format": request.format.value,
                "bitrate": request.bitrate,
                "prompt": request.prompt,
            }

            cached_track = await audio_cache.get_cached_track(generation_params)
            if cached_track:
                return MusicGenerationResponse(success=True, track=cached_track)

            # 新規生成 - AudioCraftを優先、エラー時はプログラマブル生成にフォールバック
            try:
                track, audio_data = await self._generate_audiocraft_music(request)
            except Exception as e:
                print(
                    f"AudioCraft generation failed, falling back to programmatic: {e}"
                )
                track, audio_data = await self._generate_programmatic_music(request)

            return MusicGenerationResponse(success=True, track=track)

        except Exception as e:
            return MusicGenerationResponse(
                success=False, error_message=f"音楽生成エラー: {str(e)}"
            )

    async def _generate_programmatic_music(
        self, request: MusicGenerationRequest
    ) -> GeneratedTrack:
        """プログラマブル音楽生成"""

        # ジャンル設定を取得
        config = self.genre_configs.get(
            request.genre, self.genre_configs[MusicGenreEnum.SLEEP]
        )

        # 強度に応じた調整
        intensity_multiplier = {
            IntensityEnum.LOW: 0.5,
            IntensityEnum.MEDIUM: 0.8,
            IntensityEnum.HIGH: 1.0,
        }[request.intensity]

        # トラック生成
        tracks = []
        duration_per_track = float(request.duration)

        # ベース周波数トラック
        for freq in config["base_frequencies"]:
            amplitude = 0.15 * intensity_multiplier
            track_samples = self.programmatic_generator.generate_sine_wave(
                freq, duration_per_track, amplitude
            )
            tracks.append(track_samples)

        # ハーモニクストラック
        for freq in config["harmonics"]:
            amplitude = 0.08 * intensity_multiplier
            track_samples = self.programmatic_generator.generate_sine_wave(
                freq, duration_per_track, amplitude
            )
            tracks.append(track_samples)

        # ノイズトラック
        if config["noise_mix"] > 0:
            noise_amplitude = 0.1 * config["noise_mix"] * intensity_multiplier
            noise_samples = self.programmatic_generator.generate_brown_noise(
                duration_per_track, noise_amplitude
            )
            tracks.append(noise_samples)

        # トラックをミックス
        volumes = [1.0] * len(tracks)
        mixed_samples = self.programmatic_generator.mix_tracks(tracks, volumes)

        # フェード適用
        mixed_samples = self.programmatic_generator.apply_fade(
            mixed_samples, fade_duration=10.0
        )

        # WAVファイルに変換
        audio_data = self.programmatic_generator.samples_to_wav(mixed_samples)

        # トラック情報作成
        track_id = str(uuid.uuid4())
        track = GeneratedTrack(
            id=track_id,
            title=f"{request.genre.value.title()} - {request.intensity.value.title()}",
            genre=request.genre,
            duration=request.duration,
            format=AudioFormatEnum.WAV,  # 現在はWAVのみサポート
            bitrate=128,  # 仮の値
            file_size=len(audio_data),
            created_at=datetime.utcnow(),
            generation_method="programmatic_synthesis",
        )

        # キャッシュに保存
        generation_params = {
            "genre": request.genre.value,
            "duration": request.duration,
            "intensity": request.intensity.value,
            "format": request.format.value,
            "bitrate": request.bitrate,
            "prompt": request.prompt,
        }

        cache_key = await audio_cache.cache_track(track, audio_data, generation_params)

        # ファイルURLを更新
        track.file_url = f"/api/v1/ai-music/tracks/{cache_key}/audio"

        return track, audio_data

    async def _generate_audiocraft_music(
        self, request: MusicGenerationRequest
    ) -> tuple[GeneratedTrack, bytes]:
        """AudioCraft音楽生成"""
        try:
            track, audio_data = await audiocraft_generator.generate_music(request)

            # キャッシュに保存
            generation_params = {
                "genre": request.genre.value,
                "duration": request.duration,
                "intensity": request.intensity.value,
                "format": request.format.value,
                "bitrate": request.bitrate,
                "prompt": request.prompt,
            }

            cache_key = await audio_cache.cache_track(
                track, audio_data, generation_params
            )

            # ファイルURLを更新
            track.file_url = f"/api/v1/ai-music/tracks/{cache_key}/audio"

            return track, audio_data

        except Exception as e:
            print(f"AudioCraft generation error: {e}")
            raise

    async def get_track_audio(self, track_id: str) -> bytes | None:
        """
        トラックの音声データを取得

        Args:
            track_id: トラックID（キャッシュキー）

        Returns:
            音声データ（バイト）
        """
        try:
            # キャッシュからエントリを取得
            entry = audio_cache._cache_index.get(track_id)
            if not entry:
                return None

            # ファイルを読み込み
            with open(entry.file_path, "rb") as f:
                return f.read()

        except Exception as e:
            print(f"Error getting track audio: {e}")
            return None


# グローバル音楽生成サービス
ai_music_generator = AIMusicGenerator()
