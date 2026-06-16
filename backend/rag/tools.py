"""
Herramientas (Tools) que el Agente Autónomo puede decidir utilizar.
"""
import json
from langchain_core.tools import tool
from config import OPENAI_API_KEY, EMBEDDING_MODEL
from vector_store.supabase_client import search_similar_chunks, search_similar_fallas
from openai import OpenAI

_openai_client = OpenAI(api_key=OPENAI_API_KEY)

def _embed_text(text: str) -> list[float]:
    res = _openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text.replace("\n", " ")
    )
    return res.data[0].embedding

def _format_chunk(chunk: dict) -> str:
    parts = []
    fuente = chunk.get("fuente", "")
    pagina = chunk.get("pagina")
    if fuente or pagina:
        ref = fuente.replace(".pdf", "") if fuente else ""
        ref_str = f"[{ref} – Pág. {pagina}]" if (ref and pagina) else f"[{ref}]"
        parts.append(ref_str)

    datos = chunk.get("datos")
    texto_plano = ""
    if datos:
        if isinstance(datos, str):
            try:
                datos = json.loads(datos)
            except:
                datos = {}
        if isinstance(datos, dict):
            texto_plano = (datos.get("texto_plano") or "").strip()

    if texto_plano:
        parts.append(texto_plano)
    return "\n".join(parts)


@tool
def buscar_manuales_tecnicos(consulta: str, motocicleta: str) -> str:
    """
    ÚTIL PARA: Buscar especificaciones técnicas, capacidades de aceite, presiones de llantas, 
    diagramas eléctricos, mantenimientos o cualquier información que esté en el manual del fabricante.
    No la uses para solucionar averías si no te piden el manual.
    """
    # Enriquecemos el embedding asegurándonos de que la moto esté en la búsqueda
    busqueda_completa = f"{motocicleta} {consulta}"
    embedding = _embed_text(busqueda_completa)
    
    chunks = search_similar_chunks(embedding, top_k=7)
    
    if not chunks:
        return "No se encontró información en los manuales sobre esto."
        
    resultados = []
    for c in chunks:
        resultados.append(_format_chunk(c))
        
    return "\n\n---\n\n".join(resultados)

@tool
def diagnosticar_falla_mecanica(sintoma: str, motocicleta: str) -> str:
    """
    ÚTIL PARA: Buscar el diagnóstico, posibles causas o pasos de reparación para una falla mecánica específica, 
    ruido, problema o síntoma que reporte el usuario.
    """
    busqueda_completa = f"{motocicleta} {sintoma}"
    embedding = _embed_text(busqueda_completa)
    
    fallas = search_similar_fallas(embedding, top_k=3)
    
    if not fallas:
        return "No se encontraron reportes de fallas específicas para este síntoma. Intenta buscar en los manuales técnicos."
        
    resultados = []
    for f in fallas:
        modelo = f.get('modelo', 'General')
        comp = f.get('componente', '')
        causa = f.get('causa', '')
        solucion = f.get('solucion', '')
        resultados.append(f"Falla: {comp} (Moto: {modelo})\nCausa: {causa}\nSolución: {solucion}")
        
    return "\n\n".join(resultados)
