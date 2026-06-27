"""
Tools that the autonomous Pegasus agent can decide to use.

Each tool performs a specific function:
- buscar_manuales_tecnicos: Search technical manuals for specs and maintenance
- diagnosticar_falla_mecanica: Diagnose mechanical faults from symptoms
- comparar_motos: Compare specifications of two motorcycles
"""
import json
from langchain_core.tools import tool
from config import OPENAI_API_KEY, EMBEDDING_MODEL
from vector_store.supabase_client import search_similar_chunks, search_similar_fallas, check_model_exists
from openai import OpenAI

_openai_client = OpenAI(api_key=OPENAI_API_KEY)

def _embed_text(text: str) -> list[float]:
    """Generates an embedding vector for the given text using OpenAI's embedding model."""
    res = _openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text.replace("\n", " ")
    )
    return res.data[0].embedding

def _format_chunk(chunk: dict) -> str:
    """
    Formats a manual chunk into a readable string.

    Handles both structured JSON data (new format with titulo, componentes,
    procedimientos) and plain text fallback (legacy format).
    Includes source reference and page number when available.
    """
    parts = []
    fuente = chunk.get("fuente", "")
    pagina = chunk.get("pagina")
    if fuente or pagina:
        ref = fuente.replace(".pdf", "") if fuente else ""
        ref_str = f"[{ref} – Pág. {pagina}]" if (ref and pagina) else f"[{ref}]"
        parts.append(ref_str)

    # Extract structured data from the "texto" column (Solución B - Problema 5)
    texto_estructurado = chunk.get("texto")
    if isinstance(texto_estructurado, str):
        try:
            texto_estructurado = json.loads(texto_estructurado)
        except:
            pass

    usado_estructurado = False
    if isinstance(texto_estructurado, dict):
        titulo = texto_estructurado.get("titulo", "")
        if titulo and titulo != "Información del Manual":
            parts.append(f"Sección: {titulo}")
            
        desc = texto_estructurado.get("descripcion", "")
        if desc:
            parts.append(f"Descripción: {desc}")
            
        comps = texto_estructurado.get("componentes", [])
        if comps and isinstance(comps, list):
            parts.append("Componentes/Repuestos:")
            for c in comps:
                if isinstance(c, dict):
                    desc_c = c.get('descripcion', '')
                    parte = c.get('parte_no')
                    cant = c.get('cantidad')
                    txt = f"  - {desc_c}"
                    if parte: txt += f" (Parte N°: {parte})"
                    if cant: txt += f" [Cant: {cant}]"
                    parts.append(txt)
                else:
                    parts.append(f"  - {c}")
                    
        procs = texto_estructurado.get("procedimientos")
        if procs and isinstance(procs, list):
            parts.append("Procedimientos:")
            for p in procs:
                parts.append(f"  - {p}")
                
        usado_estructurado = True

    # Fallback to plain text for legacy documents without structured JSON
    if not usado_estructurado:
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
    Tool for searching technical manuals.

    USEFUL FOR: Looking up technical specs, oil capacities, tire pressures,
    electrical diagrams, maintenance procedures, or any manufacturer manual data.
    Do not use this to solve breakdowns unless the user specifically asks for the manual.
    """
    # Check if the motorcycle exists in the manuals database
    if not check_model_exists(motocicleta, "manuales_chunks"):
        return f"No tengo registros de manuales técnicos para la moto: {motocicleta}."

    # Enrich the embedding by including the motorcycle name in the search
    busqueda_completa = f"{motocicleta} {consulta}".strip()
    embedding = _embed_text(busqueda_completa)
    
    chunks = search_similar_chunks(embedding, motocicleta=motocicleta, top_k=7)
    
    if not chunks:
        return "No se encontró información en los manuales sobre esto."
        
    resultados = []
    for c in chunks:
        resultados.append(_format_chunk(c))
        
    return "\n\n---\n\n".join(resultados)

@tool
def diagnosticar_falla_mecanica(sintoma: str, motocicleta: str) -> str:
    """
    Tool for diagnosing mechanical faults.

    USEFUL FOR: Looking up diagnosis, possible causes, or repair steps
    for a specific mechanical fault, noise, issue, or symptom reported by the user.
    """
    # Check if the motorcycle exists in the faults database
    if not check_model_exists(motocicleta, "fallas_diagnostico"):
        return f"No tengo registros de fallas para la moto: {motocicleta}."

    busqueda_completa = f"{motocicleta} {sintoma}".strip()
    embedding = _embed_text(busqueda_completa)
    
    fallas = search_similar_fallas(embedding, motocicleta=motocicleta, top_k=3)
    
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

@tool
def comparar_motos(moto1: str, moto2: str) -> str:
    """
    Tool for comparing two different motorcycles.

    USEFUL FOR: Comparing two motorcycles (e.g. to know which is better,
    differences in engine, specifications, etc.).
    """
    # Search general info (e.g. spec sheet) for motorcycle 1
    if check_model_exists(moto1, "manuales_chunks"):
        emb1 = _embed_text(f"{moto1} ficha tecnica especificaciones")
        chunks1 = search_similar_chunks(emb1, motocicleta=moto1, top_k=3)
        res1 = "\n".join([_format_chunk(c) for c in chunks1])
    else:
        res1 = f"No hay información técnica disponible para {moto1}."

    # Search general info for motorcycle 2
    if check_model_exists(moto2, "manuales_chunks"):
        emb2 = _embed_text(f"{moto2} ficha tecnica especificaciones")
        chunks2 = search_similar_chunks(emb2, motocicleta=moto2, top_k=3)
        res2 = "\n".join([_format_chunk(c) for c in chunks2])
    else:
        res2 = f"No hay información técnica disponible para {moto2}."

    return f"--- DATOS DE {moto1.upper()} ---\n{res1}\n\n--- DATOS DE {moto2.upper()} ---\n{res2}\n\nCon esta información, realiza la comparación solicitada por el usuario."

