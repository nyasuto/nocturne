"""
AudioCraft音楽生成サービス

Hugging Face TransformersのMusicGenを使用して睡眠・リラクゼーション音楽を生成
"""

import asyncio
import logging
import os
import tempfile
import uuid
from datetime import datetime

import soundfile as sf
import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration

from app.schemas.ai_music import (
    AudioFormatEnum,
    GeneratedTrack,
    IntensityEnum,
    MusicGenerationRequest,
    MusicGenreEnum,
)

logger = logging.getLogger(__name__)


class AudioCraftMusicGenerator:
    """AudioCraft MusicGen音楽生成器"""

    def __init__(self):
        """初期化"""
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.model_name = "facebook/musicgen-small"  # 軽量モデルから開始
        self.sample_rate = 32000  # MusicGenのデフォルトサンプル率

        # プロセッサーとモデルは遅延ロード
        self._processor: AutoProcessor | None = None
        self._model: MusicgenForConditionalGeneration | None = None
        self._model_loaded = False

        # ジャンル別プロンプトテンプレート
        self.genre_prompts = {
            MusicGenreEnum.SLEEP: {
                IntensityEnum.LOW: "soft ambient pad, very slow, peaceful, 40Hz sine wave undertone",
                IntensityEnum.MEDIUM: "gentle ambient music, calm pad, slow tempo, relaxing atmosphere",
                IntensityEnum.HIGH: "warm ambient soundscape, flowing pads, meditative",
            },
            MusicGenreEnum.AMBIENT: {
                IntensityEnum.LOW: "minimal ambient, ethereal pad, very spacious",
                IntensityEnum.MEDIUM: "atmospheric ambient, gentle reverb, calm",
                IntensityEnum.HIGH: "rich ambient texture, evolving pads, immersive",
            },
            MusicGenreEnum.WHITE_NOISE: {
                IntensityEnum.LOW: "soft static noise, gentle white noise background",
                IntensityEnum.MEDIUM: "white noise, steady ambient background",
                IntensityEnum.HIGH: "full spectrum white noise, consistent level",
            },
            MusicGenreEnum.NATURE_SOUNDS: {
                IntensityEnum.LOW: "gentle rain, soft nature sounds, peaceful",
                IntensityEnum.MEDIUM: "forest ambience, birds, gentle wind",
                IntensityEnum.HIGH: "ocean waves, natural soundscape, flowing water",
            },
            MusicGenreEnum.MEDITATION: {
                IntensityEnum.LOW: "meditation bell, very minimal, sacred space",
                IntensityEnum.MEDIUM: "tibetan singing bowl, peaceful meditation",
                IntensityEnum.HIGH: "rich meditation ambience, spiritual atmosphere",
            },
        }

    async def _load_model(self) -> None:
        """モデルを遅延ロード"""
        if self._model_loaded:
            return

        try:
            logger.info(f"Loading MusicGen model: {self.model_name}")

            # CPUで実行する場合は別スレッドでロード
            def load_model():
                processor = AutoProcessor.from_pretrained(self.model_name)
                model = MusicgenForConditionalGeneration.from_pretrained(
                    self.model_name
                )

                # デバイスに移動（MPSまたはCPU）
                model = model.to(self.device)

                return processor, model

            # 非同期でモデルロード
            loop = asyncio.get_event_loop()
            self._processor, self._model = await loop.run_in_executor(None, load_model)

            self._model_loaded = True
            logger.info(f"Model loaded successfully on device: {self.device}")

        except Exception as e:
            logger.error(f"Failed to load MusicGen model: {e}")
            raise

    def _get_generation_prompt(
        self,
        genre: MusicGenreEnum,
        intensity: IntensityEnum,
        user_prompt: str | None = None,
    ) -> str:
        """ジャンルと強度に基づいてプロンプトを生成"""
        base_prompt = self.genre_prompts.get(genre, {}).get(
            intensity, "peaceful ambient music"
        )

        if user_prompt:
            # ユーザープロンプトがある場合は組み合わせ
            return f"{user_prompt}, {base_prompt}"

        return base_prompt

    async def generate_music(self, request: MusicGenerationRequest) -> GeneratedTrack:
        """
        音楽を生成

        Args:
            request: 音楽生成リクエスト

        Returns:
            生成されたトラック情報
        """
        try:
            # モデルロード
            await self._load_model()

            # プロンプト生成
            prompt = self._get_generation_prompt(
                request.genre, request.intensity, request.prompt
            )

            logger.info(f"Generating music with prompt: '{prompt}'")
            logger.info(f"Duration: {request.duration}s, Device: {self.device}")

            # 音楽生成を別スレッドで実行
            audio_data = await self._generate_audio(prompt, request.duration)

            # トラック情報作成
            track_id = str(uuid.uuid4())
            track = GeneratedTrack(
                id=track_id,
                title=f"{request.genre.value.title()} - {request.intensity.value.title()}",
                genre=request.genre,
                duration=request.duration,
                format=AudioFormatEnum.WAV,
                bitrate=128,  # 概算値
                file_size=len(audio_data),
                created_at=datetime.utcnow(),
                generation_method="audiocraft_musicgen",
                metadata={
                    "model": self.model_name,
                    "prompt": prompt,
                    "sample_rate": self.sample_rate,
                    "device": self.device,
                },
            )

            logger.info(
                f"Generated track {track_id} successfully ({len(audio_data)} bytes)"
            )
            return track, audio_data

        except Exception as e:
            logger.error(f"Music generation failed: {e}")
            raise

    async def _generate_audio(self, prompt: str, duration: int) -> bytes:
        """音声生成の実際の処理"""

        def generate():
            # プロンプトを処理
            inputs = self._processor(text=[prompt], padding=True, return_tensors="pt")

            # デバイスに移動
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # 音楽生成パラメータ
            max_new_tokens = int(self.sample_rate * duration / 32)  # 圧縮率考慮

            # 生成実行
            with torch.no_grad():
                audio_values = self._model.generate(
                    **inputs,
                    max_new_tokens=min(max_new_tokens, 1024),  # トークン数制限
                    do_sample=True,
                    guidance_scale=3.0,
                    temperature=1.0,
                )

            # NumPy配列として取得
            audio_array = audio_values[0].cpu().numpy()

            # WAVファイルとして保存
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                sf.write(tmp_file.name, audio_array, self.sample_rate, format="WAV")
                tmp_file.flush()

                # ファイルを読み込んでバイトデータとして返す
                with open(tmp_file.name, "rb") as f:
                    audio_data = f.read()

                # 一時ファイル削除
                os.unlink(tmp_file.name)

                return audio_data

        # 非同期実行
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, generate)

    async def health_check(self) -> dict:
        """ヘルスチェック"""
        try:
            return {
                "status": "healthy",
                "model": self.model_name,
                "device": self.device,
                "model_loaded": self._model_loaded,
                "mps_available": torch.backends.mps.is_available(),
                "cuda_available": torch.cuda.is_available(),
            }
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}


# グローバル音楽生成サービス
audiocraft_generator = AudioCraftMusicGenerator()
