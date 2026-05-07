"""Configuración central del backend usando variables de entorno."""
import os
from dotenv import load_dotenv

load_dotenv()

# === SUPABASE ===
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

# === OPENAI ===
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

# === VECTOR STORE ===
# Tabla real en Supabase con columnas: id, texto (JSON), fuente, pagina, datos (JSONB), embedding
VECTOR_TABLE: str = os.getenv("VECTOR_TABLE", "manuales_chunks")
VECTOR_MATCH_COUNT: int = int(os.getenv("VECTOR_MATCH_COUNT", "5"))

# === AUTH ===
JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")


def validate_config() -> None:
    """Verifica que las variables críticas estén configuradas."""
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY:
        missing.append("SUPABASE_SERVICE_KEY")
    if not OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")
    if missing:
        raise RuntimeError(
            f"❌ Variables de entorno faltantes en .env: {', '.join(missing)}"
        )
