"""Configuración central del backend usando variables de entorno.

Un solo sistema: la clase Settings de pydantic_settings lee el archivo .env
y expone todas las variables como atributos tipados.
"""
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    # === SUPABASE ===
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # === OPENAI / LLM ===
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # === VECTOR STORE (Supabase table) ===
    VECTOR_TABLE: str = "manuales_chunks"
    VECTOR_MATCH_COUNT: int = 5

    # === DATABASE (PostgreSQL) ===
    DATABASE_URL: str = "postgresql+asyncpg://motorconnect:localdev123@db:5432/motorconnect_db"

    # === AUTH ===
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # === BACKEND ===
    API_PORT: int = 8000

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

# ── Variables globales (alias para compatibilidad con imports existentes) ──
# El código del RAG (retriever.py, generator.py) importa directamente estas
# variables, así que las exponemos como alias del objeto settings.
SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_SERVICE_KEY = settings.SUPABASE_SERVICE_KEY
OPENAI_API_KEY = settings.OPENAI_API_KEY
LLM_MODEL = settings.LLM_MODEL
EMBEDDING_MODEL = settings.EMBEDDING_MODEL
VECTOR_TABLE = settings.VECTOR_TABLE
VECTOR_MATCH_COUNT = settings.VECTOR_MATCH_COUNT


def validate_config() -> None:
    """Verifica que las variables críticas estén configuradas."""
    missing = []
    if not settings.SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not settings.SUPABASE_SERVICE_KEY:
        missing.append("SUPABASE_SERVICE_KEY")
    if not settings.OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")
    if missing:
        raise RuntimeError(
            f"❌ Variables de entorno faltantes en .env: {', '.join(missing)}"
        )
