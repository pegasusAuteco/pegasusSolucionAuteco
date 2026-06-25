"""
Text-to-speech provider with Redis caching.

Supports OpenAI and ElevenLabs as TTS backends. Audio responses are cached
in Redis for 7 days to avoid redundant API calls for identical text.
"""
import hashlib
import os

import httpx
import redis.asyncio as aioredis
from openai import OpenAI

from config import settings

_openai_client: OpenAI | None = None
_redis_client: aioredis.Redis | None = None

_VALID_PROVIDERS = {"openai", "elevenlabs"}
_CACHE_TTL = 604800  # 7 days in seconds


def _get_openai() -> OpenAI:
    """Returns a lazily-initialized OpenAI client singleton."""
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def _get_redis() -> aioredis.Redis:
    """
    Returns a lazily-initialized Redis client singleton.

    Uses decode_responses=False to store binary audio data.
    The session system uses a separate client with decode_responses=True.
    """
    global _redis_client
    if _redis_client is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        _redis_client = aioredis.from_url(url, decode_responses=False)
    return _redis_client


def _cache_key(text: str) -> str:
    """Generates an MD5-based Redis cache key for the given text."""
    digest = hashlib.md5(text.encode()).hexdigest()
    return f"tts_cache:{digest}"


def _synthesize_openai(text: str) -> bytes:
    """Synthesizes speech using OpenAI's TTS API."""
    response = _get_openai().audio.speech.create(
        model="tts-1",
        voice=settings.OPENAI_TTS_VOICE,
        input=text,
    )
    return response.content


def _synthesize_elevenlabs(text: str) -> bytes:
    """Synthesizes speech using ElevenLabs TTS API."""
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
    """
    Main TTS entry point. Returns audio bytes for the given text.

    Checks Redis cache first; on cache miss, synthesizes via the configured
    provider (OpenAI or ElevenLabs) and stores the result for future requests.
    """
    key = _cache_key(text)
    redis = _get_redis()

    # Try reading from cache
    try:
        cached = await redis.get(key)
        if cached:
            print(f"TTS cache HIT — key={key}")
            return cached
        print(f"TTS cache MISS — key={key}")
    except Exception as e:
        print(f"Redis unavailable for TTS cache (read): {e}")

    # Synthesize audio
    provider = settings.TTS_PROVIDER.lower()
    if provider not in _VALID_PROVIDERS:
        print(f"TTS_PROVIDER='{provider}' not valid. Falling back to OpenAI.")
        provider = "openai"

    audio_bytes = _synthesize_elevenlabs(text) if provider == "elevenlabs" else _synthesize_openai(text)

    # Store in cache
    try:
        await redis.set(key, audio_bytes, ex=_CACHE_TTL)
    except Exception as e:
        print(f"Redis unavailable for TTS cache (write): {e}")

    return audio_bytes
