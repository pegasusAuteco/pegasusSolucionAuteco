"""
Herramientas (Tools) que el Agente Autónomo puede decidir utilizar.
"""
import json
from langchain_core.tools import tool
from config import OPENAI_API_KEY, EMBEDDING_MODEL
from vector_store.supabase_client import search_similar_chunks, search_similar_fallas, check_model_exists
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

    # Obtenemos la data estructurada de la columna "texto" (Solución B - Problema 5)
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

    # Si no había JSON estructurado (documentos viejos), hacemos fallback al texto plano
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
    ÚTIL PARA: Buscar especificaciones técnicas, capacidades de aceite, presiones de llantas, 
    diagramas eléctricos, mantenimientos o cualquier información que esté en el manual del fabricante.
    No la uses para solucionar averías si no te piden el manual.
    """
    # Verificamos si la moto existe en la base de datos de manuales (Solución B)
    if not check_model_exists(motocicleta, "manuales_chunks"):
        return f"No tengo registros de manuales técnicos para la moto: {motocicleta}."

    # Enriquecemos el embedding asegurándonos de que la moto esté en la búsqueda
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
    ÚTIL PARA: Buscar el diagnóstico, posibles causas o pasos de reparación para una falla mecánica específica, 
    ruido, problema o síntoma que reporte el usuario.
    """
    # Verificamos si la moto existe en la base de datos de fallas (Solución B)
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
    ÚTIL PARA: Comparar dos motocicletas distintas (ej. para saber cuál es mejor, diferencias en motor, etc.).
    """
    # Buscamos información general (ej. ficha técnica) para la moto 1
    if check_model_exists(moto1, "manuales_chunks"):
        emb1 = _embed_text(f"{moto1} ficha tecnica especificaciones")
        chunks1 = search_similar_chunks(emb1, motocicleta=moto1, top_k=3)
        res1 = "\n".join([_format_chunk(c) for c in chunks1])
    else:
        res1 = f"No hay información técnica disponible para {moto1}."

    # Buscamos información general para la moto 2
    if check_model_exists(moto2, "manuales_chunks"):
        emb2 = _embed_text(f"{moto2} ficha tecnica especificaciones")
        chunks2 = search_similar_chunks(emb2, motocicleta=moto2, top_k=3)
        res2 = "\n".join([_format_chunk(c) for c in chunks2])
    else:
        res2 = f"No hay información técnica disponible para {moto2}."

    return f"--- DATOS DE {moto1.upper()} ---\n{res1}\n\n--- DATOS DE {moto2.upper()} ---\n{res2}\n\nCon esta información, realiza la comparación solicitada por el usuario."

