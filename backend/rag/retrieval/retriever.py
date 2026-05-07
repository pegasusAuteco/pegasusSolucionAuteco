"""
Módulo de recuperación RAG.
Genera el embedding de la pregunta y busca los chunks más relevantes
en la tabla manuales_chunks de Supabase.

Estructura de cada fila en manuales_chunks:
    - id       → int
    - texto    → JSON string con {"titulo": "...", "descripcion": "..."}
    - fuente   → nombre del PDF (ej: "BENELLI-180S-CBS.pdf")
    - pagina   → número de página (int)
    - datos    → JSONB con {"texto_plano": "..."} y otros campos
    - embedding → vector(1536)
"""
import json
from openai import OpenAI
from config import OPENAI_API_KEY, EMBEDDING_MODEL
from vector_store.supabase_client import search_similar_chunks

_openai_client: OpenAI | None = None


def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=OPENAI_API_KEY)
    return _openai_client


def embed_query(text: str) -> list[float]:
    """Genera el embedding de un texto usando OpenAI."""
    client = _get_openai()
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text.replace("\n", " "),
    )
    return response.data[0].embedding


def _parse_texto(texto_raw) -> dict:
    """
    Parsea el campo 'texto' que viene como string JSON.
    Retorna dict con titulo y descripcion (o cadenas vacías si falla).
    """
    if not texto_raw:
        return {"titulo": "", "descripcion": ""}
    if isinstance(texto_raw, dict):
        return texto_raw
    try:
        return json.loads(texto_raw)
    except Exception:
        # A veces viene como texto plano, lo usamos directo
        return {"titulo": "", "descripcion": str(texto_raw)}


def _format_chunk(chunk: dict) -> str:
    """
    Convierte una fila de manuales_chunks en texto legible para el LLM.

    Prioridad de contenido:
    1. datos.texto_plano  → texto completo de la página (más rico)
    2. texto.titulo       → título de la sección
    3. texto.descripcion  → descripción breve
    4. fuente + pagina    → referencia de origen
    """
    parts = []

    # Referencia de origen
    fuente = chunk.get("fuente", "")
    pagina = chunk.get("pagina")
    if fuente or pagina:
        ref = fuente.replace(".pdf", "") if fuente else ""
        ref_str = f"[{ref} – Pág. {pagina}]" if (ref and pagina) else f"[Pág. {pagina}]" if pagina else f"[{ref}]"
        parts.append(ref_str)

    # Texto plano completo (campo datos.texto_plano)
    datos = chunk.get("datos")
    texto_plano = ""
    if datos:
        if isinstance(datos, str):
            try:
                datos = json.loads(datos)
            except Exception:
                datos = {}
        if isinstance(datos, dict):
            texto_plano = datos.get("texto_plano", "").strip()

    if texto_plano:
        parts.append(texto_plano)
    else:
        # Fallback: usar titulo y descripcion del campo texto
        texto_parsed = _parse_texto(chunk.get("texto"))
        titulo = texto_parsed.get("titulo", "").strip()
        descripcion = texto_parsed.get("descripcion", "").strip()
        if titulo:
            parts.append(f"Título: {titulo}")
        if descripcion:
            parts.append(f"Descripción: {descripcion}")

    return "\n".join(parts)


def retrieve_context(query: str, top_k: int = 5) -> list[str]:
    """
    Pipeline de recuperación RAG:
    1. Genera embedding de la pregunta del usuario
    2. Busca los top_k chunks más similares en Supabase
    3. Formatea cada chunk como texto legible para el LLM
    """
    embedding = embed_query(query)
    chunks = search_similar_chunks(embedding, top_k=top_k)

    context_texts = []
    for chunk in chunks:
        formatted = _format_chunk(chunk)
        if formatted.strip():
            context_texts.append(formatted)

    return context_texts
