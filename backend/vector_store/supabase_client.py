"""
Supabase client for vector search operations.

Provides functions for checking motorcycle model existence and
performing similarity searches across manuals and fault databases
using embedding vectors.
"""
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, VECTOR_TABLE, VECTOR_MATCH_COUNT

_client: Client | None = None


def get_supabase() -> Client:
    """
    Returns the Supabase client singleton.

    Creates the client on first call using credentials from config.
    Raises RuntimeError if credentials are not configured.
    """
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar en el .env"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def check_model_exists(motocicleta: str, table_name: str) -> bool:
    """
    Checks if a motorcycle model exists in the specified table.

    Uses the first keyword of the model name for flexible matching
    (e.g. "Ninja" matches "Ninja 400").

    Returns True if no motocicleta is specified or if the model is found.
    Returns True on error as a safety measure (allows search to proceed).
    """
    if not motocicleta or motocicleta.lower() == "general":
        return True
    
    client = get_supabase()
    try:
        # Extract the first keyword for flexible search (e.g. "Ninja" instead of "Ninja 400")
        palabra_clave = motocicleta.lower().replace("-", " ").split()[0]
        columna = "fuente" if table_name == "manuales_chunks" else "modelo"
        response = client.table(table_name).select("id").ilike(columna, f"%{palabra_clave}%").limit(1).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error checking model existence for {motocicleta} in {table_name}: {e}")
        return True  # Allow search to proceed on verification failure


def search_similar_chunks(query_embedding: list[float], motocicleta: str = "", top_k: int = VECTOR_MATCH_COUNT, threshold: float = 0.35) -> list[dict]:
    """
    Searches the manuales_chunks table for similar content.

    Uses Supabase RPC for vector similarity search, then filters locally
    by similarity threshold and motorcycle model (source field).
    """
    client = get_supabase()
    try:
        # Fetch more results to allow local filtering without running out of data
        response = client.rpc(
            "match_manuales_chunks",
            {
                "query_embedding": query_embedding,
                "match_count": 100, 
            },
        ).execute()
        
        # Filter by similarity threshold and model (source)
        resultados = response.data or []
        resultados_filtrados = []
        for r in resultados:
            if r.get("similarity", 1.0) < threshold:
                continue
            
            # Filter by source (manual title)
            fuente = r.get("fuente", "").lower().replace("-", " ")
            mot_norm = motocicleta.lower().replace("-", " ")
            if motocicleta and motocicleta.lower() != "general":
                # Check if the first word of the model is in the source
                palabras = mot_norm.split()
                if palabras and palabras[0] not in fuente:
                    continue
            
            resultados_filtrados.append(r)
            if len(resultados_filtrados) >= top_k:
                break
                
        return resultados_filtrados
    except Exception as e:
        print(f"Error in manuals RPC: {e}")
        return []


def search_similar_fallas(query_embedding: list[float], motocicleta: str = "", top_k: int = 3, threshold: float = 0.35) -> list[dict]:
    """
    Searches the fallas_diagnostico table for similar faults.

    Uses Supabase RPC for vector similarity search, then filters locally
    by similarity threshold and motorcycle model.
    """
    client = get_supabase()
    try:
        # Fetch more results for local filtering
        response = client.rpc(
            "match_fallas_diagnostico",
            {
                "query_embedding": query_embedding,
                "match_count": 100,
            },
        ).execute()
        
        # Filter by threshold and model
        resultados = response.data or []
        resultados_filtrados = []
        for r in resultados:
            if r.get("similarity", 1.0) < threshold:
                continue
                
            modelo = r.get("modelo", "").lower().replace("-", " ")
            mot_norm = motocicleta.lower().replace("-", " ")
            if motocicleta and motocicleta.lower() != "general":
                palabras = mot_norm.split()
                if palabras and palabras[0] not in modelo:
                    continue
                    
            resultados_filtrados.append(r)
            if len(resultados_filtrados) >= top_k:
                break
                
        return resultados_filtrados
    except Exception as e:
        print(f"Error in faults RPC: {e}")
        return []
