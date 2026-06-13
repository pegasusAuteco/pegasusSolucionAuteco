import hashlib
import os

import httpx
import redis.asyncio as aioredis
from openai import OpenAI

from config import settings

_openai_client: OpenAI | None = None
_redis_client: aioredis.Redis | None = None

_VALID_PROVIDERS = {"openai", "elevenlabs"}
_CACHE_TTL = 604800  # 7 días


def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def _get_redis() -> aioredis.Redis:
    # Conexión separada con decode_responses=False para poder almacenar bytes binarios.
    # El cliente del sistema de sesiones usa decode_responses=True (solo strings),
    # por lo que no puede usarse directamente para cachear audio.
    global _redis_client
    if _redis_client is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        _redis_client = aioredis.from_url(url, decode_responses=False)
    return _redis_client


def _cache_key(text: str) -> str:
    digest = hashlib.md5(text.encode()).hexdigest()
    return f"tts_cache:{digest}"


def _synthesize_openai(text: str) -> bytes:
    response = _get_openai().audio.speech.create(
        model="tts-1",
        voice=settings.OPENAI_TTS_VOICE,
        input=text,
    )
    return response.content


def _synthesize_elevenlabs(text: str) -> bytes:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}"
    response = httpx.post(
        url,
        headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
        json={"text": text, "model_id": "eleven_multilingual_v2"},
        timeout=30,
    )
    response.raise_for_status()
    return response.content


async def synthesize_speech(text: str) -> bytes:
    key = _cache_key(text)
    redis = _get_redis()

    # Intentar leer de caché
    try:
        cached = await redis.get(key)
        if cached:
            print(f"TTS cache HIT — key={key}")
            return cached
        print(f"TTS cache MISS — key={key}")
    except Exception as e:
        print(f"⚠️ Redis no disponible para TTS cache (lectura): {e}")

    # Sintetizar
    provider = settings.TTS_PROVIDER.lower()
    if provider not in _VALID_PROVIDERS:
        print(f"⚠️ TTS_PROVIDER='{provider}' no válido. Usando OpenAI como fallback.")
        provider = "openai"

    audio_bytes = _synthesize_elevenlabs(text) if provider == "elevenlabs" else _synthesize_openai(text)

    # Guardar en caché
    try:
        await redis.set(key, audio_bytes, ex=_CACHE_TTL)
    except Exception as e:
        print(f"⚠️ Redis no disponible para TTS cache (escritura): {e}")

    return audio_bytes
