"""Cliente Supabase para búsqueda vectorial en manuales_chunks."""
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, VECTOR_TABLE, VECTOR_MATCH_COUNT

_client: Client | None = None


def get_supabase() -> Client:
    """Devuelve el cliente Supabase (singleton)."""
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar en el .env"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def search_similar_chunks(query_embedding: list[float], top_k: int = VECTOR_MATCH_COUNT) -> list[dict]:
    """
    Busca los chunks más similares al embedding dado en manuales_chunks.

    Columnas retornadas: id, texto, fuente, pagina, datos, similarity

    Intenta primero con la función RPC match_manuales_chunks.
    Si no existe, hace un SELECT directo como fallback.
    """
    client = get_supabase()

    try:
        response = client.rpc(
            "match_manuales_chunks",
            {
                "query_embedding": query_embedding,
                "match_count": top_k,
            },
        ).execute()
        return response.data or []

    except Exception as e:
        print(f"⚠️ RPC no disponible, usando SELECT directo: {e}")
        response = (
            client.table(VECTOR_TABLE)
            .select("id, texto, fuente, pagina, datos")
            .limit(top_k)
            .execute()
        )
        return response.data or []
