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

# Enable MPS fallback for Apple Silicon compatibility
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

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

    def __init__(self) -> None:
        """初期化"""
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        # 最高品質のlargeモデルを使用（3.3Bパラメータ）
        # 選択可能: musicgen-small (300M), musicgen-medium (1.5B), musicgen-large (3.3B)
        self.model_name = "facebook/musicgen-large"
        self.sample_rate = 32000  # MusicGenのデフォルトサンプル率

        # プロセッサーとモデルは遅延ロード
        self._processor: AutoProcessor | None = None
        self._model: MusicgenForConditionalGeneration | None = None
        self._model_loaded = False

        # ジャンル別プロンプトテンプレート（睡眠・リラクゼーション最適化）
        self.genre_prompts = {
            MusicGenreEnum.SLEEP: {
                IntensityEnum.LOW: "ultra soft ambient sleep music, deep relaxation, 432Hz healing frequency, delta waves, binaural beats, floating pads, minimal movement, dream-like atmosphere, very slow evolving textures",
                IntensityEnum.MEDIUM: "gentle sleep ambient music, soothing harmonic layers, theta waves, soft synthesizer pads, peaceful night atmosphere, slow breathing rhythm, celestial tones, sleep inducing frequencies",
                IntensityEnum.HIGH: "warm ambient sleep soundscape, lush evolving pads, deep meditation state, alpha waves, ethereal textures, night sky atmosphere, healing tones, profound relaxation",
            },
            MusicGenreEnum.AMBIENT: {
                IntensityEnum.LOW: "minimal ambient soundscape, infinite space, subtle drones, microsound textures, barely audible, zen atmosphere, stillness",
                IntensityEnum.MEDIUM: "atmospheric ambient music, spatial reverb, calm floating pads, organic textures, peaceful journey, timeless",
                IntensityEnum.HIGH: "rich cinematic ambient, evolving soundscapes, deep immersion, cosmic atmosphere, emotional depth, transcendent",
            },
            MusicGenreEnum.WHITE_NOISE: {
                IntensityEnum.LOW: "pink noise for sleep, soft filtered noise, gentle hiss, sleep therapy, consistent texture",
                IntensityEnum.MEDIUM: "brown noise for deep sleep, warm filtered noise, comfortable blanket of sound, sleep aid",
                IntensityEnum.HIGH: "sleep optimized white noise, full spectrum comfort, masking background sounds, deep sleep support",
            },
            MusicGenreEnum.NATURE_SOUNDS: {
                IntensityEnum.LOW: "soft rain on leaves, distant thunder, cozy indoor atmosphere, sleep rain, gentle drizzle",
                IntensityEnum.MEDIUM: "forest at night, crickets, owl calls, gentle breeze through trees, peaceful nature sleep sounds",
                IntensityEnum.HIGH: "ocean waves for deep sleep, rhythmic tide, seashore at night, moonlit beach, hypnotic wave patterns",
            },
            MusicGenreEnum.MEDITATION: {
                IntensityEnum.LOW: "crystal singing bowls, 528Hz love frequency, minimal meditation, sacred silence, single tone focus",
                IntensityEnum.MEDIUM: "tibetan bowls and chimes, chakra healing tones, peaceful temple atmosphere, mindfulness bells",
                IntensityEnum.HIGH: "deep meditation journey, multiple singing bowls, harmonic overtones, transcendental atmosphere, spiritual awakening",
            },
        }

    async def _load_model(self) -> None:
        """モデルを遅延ロード"""
        if self._model_loaded:
            return

        try:
            logger.info(f"Loading MusicGen model: {self.model_name}")

            # CPUで実行する場合は別スレッドでロード
            def load_model() -> tuple[AutoProcessor, MusicgenForConditionalGeneration]:
                processor = AutoProcessor.from_pretrained(self.model_name)
                model = MusicgenForConditionalGeneration.from_pretrained(
                    self.model_name,
                    dtype=torch.float16 if self.device == "mps" else torch.float32,
                    device_map=None,  # Disable auto device mapping
                )

                # デバイスに移動（MPSまたはCPU）
                model = model.to(self.device)
                model.eval()  # Set to evaluation mode

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

    async def generate_music(self, request: MusicGenerationRequest) -> tuple[GeneratedTrack, bytes]:
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

        def generate() -> bytes:
            # プロンプトを処理
            inputs = self._processor(text=[prompt], padding=True, return_tensors="pt")

            # デバイスに移動
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # 音楽生成パラメータ
            max_new_tokens = int(self.sample_rate * duration / 32)  # 圧縮率考慮

            # 生成実行（高品質パラメータ）
            with torch.no_grad():
                audio_values = self._model.generate(
                    **inputs,
                    max_new_tokens=min(max_new_tokens, 2048),  # より長い生成を許可
                    do_sample=True,
                    guidance_scale=4.5,  # より強いプロンプト追従（3.0→4.5）
                    temperature=0.8,  # より一貫性のある生成（1.0→0.8）
                    top_k=250,  # 上位250トークンから選択
                    top_p=0.95,  # 累積確率95%のトークンから選択
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
