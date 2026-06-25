"""
Central configuration module for the Pegasus backend.

Uses pydantic_settings to load environment variables from the .env file
and expose them as typed attributes. All configuration values are centralized here.
"""
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables / .env file.

    Groups:
    - SUPABASE: Vector store and database connection
    - OPENAI/LLM: AI model configuration
    - VOICE/TTS: Text-to-speech provider settings
    - VECTOR_STORE: Embedding search parameters
    - DATABASE: PostgreSQL connection
    - AUTH: JWT authentication settings
    - BACKEND: Server configuration
    """
    # === SUPABASE ===
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # === OPENAI / LLM ===
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # === VOICE / TTS ===
    TTS_PROVIDER: str = "openai"
    OPENAI_TTS_VOICE: str = "nova"
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = ""

    # === VECTOR STORE (Supabase table) ===
    VECTOR_TABLE: str = "manuales_chunks"
    VECTOR_MATCH_COUNT: int = 5

    # === DATABASE (PostgreSQL) ===
    DATABASE_URL: str = ""

    # === AUTH ===
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # === BACKEND ===
    API_PORT: int = 8000

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

# Global aliases for backward compatibility with existing imports.
# RAG code (retriever.py, generator.py) imports these variables directly.
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_SERVICE_KEY = settings.SUPABASE_SERVICE_KEY
OPENAI_API_KEY = settings.OPENAI_API_KEY
LLM_MODEL = settings.LLM_MODEL
EMBEDDING_MODEL = settings.EMBEDDING_MODEL
VECTOR_TABLE = settings.VECTOR_TABLE
VECTOR_MATCH_COUNT = settings.VECTOR_MATCH_COUNT


def validate_config() -> None:
    """
    Validates that all critical environment variables are configured.

    Raises:
        RuntimeError: If any required variable (SUPABASE_URL, SUPABASE_SERVICE_KEY,
                      or OPENAI_API_KEY) is missing or empty.
    """
    missing = []
    if not settings.SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not settings.SUPABASE_SERVICE_KEY:
        missing.append("SUPABASE_SERVICE_KEY")
    if not settings.OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")
    if missing:
        raise RuntimeError(
            f"Missing required environment variables in .env: {', '.join(missing)}"
        )
