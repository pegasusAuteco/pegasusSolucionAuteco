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


def check_model_exists(motocicleta: str, table_name: str) -> bool:
    """Verifica si un modelo de moto existe en la tabla dada."""
    if not motocicleta or motocicleta.lower() == "general":
        return True
    
    client = get_supabase()
    try:
        # Extraemos la primera palabra clave para buscar de forma más flexible (ej. "Ninja" en lugar de "Ninja 400")
        palabra_clave = motocicleta.lower().replace("-", " ").split()[0]
        columna = "fuente" if table_name == "manuales_chunks" else "modelo"
        response = client.table(table_name).select("id").ilike(columna, f"%{palabra_clave}%").limit(1).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"⚠️ Error verificando existencia del modelo {motocicleta} en {table_name}: {e}")
        return True  # Por precaución, si falla la verificación, permitimos la búsqueda


def search_similar_chunks(query_embedding: list[float], motocicleta: str = "", top_k: int = VECTOR_MATCH_COUNT, threshold: float = 0.35) -> list[dict]:
    """Busca en manuales_chunks (manuales técnicos)."""
    client = get_supabase()
    try:
        # Traemos más resultados para poder filtrar localmente sin quedarnos sin datos
        response = client.rpc(
            "match_manuales_chunks",
            {
                "query_embedding": query_embedding,
                "match_count": 100, 
            },
        ).execute()
        
        # Filtramos por umbral de similitud y por modelo (fuente)
        resultados = response.data or []
        resultados_filtrados = []
        for r in resultados:
            if r.get("similarity", 1.0) < threshold:
                continue
            
            # Filtro por fuente (título del manual)
            fuente = r.get("fuente", "").lower().replace("-", " ")
            mot_norm = motocicleta.lower().replace("-", " ")
            if motocicleta and motocicleta.lower() != "general":
                # Verificamos que la primera palabra del modelo esté en la fuente
                palabras = mot_norm.split()
                if palabras and palabras[0] not in fuente:
                    continue
            
            resultados_filtrados.append(r)
            if len(resultados_filtrados) >= top_k:
                break
                
        return resultados_filtrados
    except Exception as e:
        print(f"⚠️ Error RPC manuales: {e}")
        return []


def search_similar_fallas(query_embedding: list[float], motocicleta: str = "", top_k: int = 3, threshold: float = 0.35) -> list[dict]:
    """Busca en fallas_diagnostico (base de datos de problemas y soluciones)."""
    client = get_supabase()
    try:
        # Traemos más resultados para filtrar localmente
        response = client.rpc(
            "match_fallas_diagnostico",
            {
                "query_embedding": query_embedding,
                "match_count": 100,
            },
        ).execute()
        
        # Filtramos por umbral y modelo
        resultados = response.data or []
        resultados_filtrados = []
        for r in resultados:
            if r.get("similarity", 1.0) < threshold:
                continue
                
            modelo = r.get("modelo", "").lower().replace("-", " ")
            mot_norm = motocicleta.lower().replace("-", " ")
            if motocicleta and motocicleta.lower() != "general":
                palabras = mot_norm.split()
                # Accept if it's explicitly "general" OR if the motorcycle brand matches
                if modelo != "general" and palabras and palabras[0] not in modelo:
                    continue
                    
            resultados_filtrados.append(r)
            if len(resultados_filtrados) >= top_k:
                break
                
        return resultados_filtrados
    except Exception as e:
        print(f"⚠️ Error RPC fallas: {e}")
        return []
