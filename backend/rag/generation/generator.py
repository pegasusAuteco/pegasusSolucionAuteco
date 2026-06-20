import asyncio
from langchain_core.messages import AIMessage, HumanMessage
from rag.core import pegasus_agent_executor

# Instrucción interna que se antepone SOLO a consultas de voz (voice_mode=True).
# Sirve de red de seguridad para alucinaciones de transcripción que no son
# consultas de taller (ej. frases de un video de fondo) que la detección por
# lista/confianza no atrapó: en ese caso Pegasus pide repetir en vez de inventar.
VOICE_MODE_INSTRUCTION = (
    "[INSTRUCCIÓN INTERNA – NO la menciones al usuario] "
    "Esta consulta proviene de transcripción de voz y puede contener "
    "errores de reconocimiento. Si el texto SÍ es una consulta "
    "interpretable de taller mecánico (piezas, fallas, mantenimiento, "
    "modelos de moto), respóndela normalmente aunque esté informal o "
    "incompleta. Pero si el texto NO parece una consulta de taller "
    "—por ejemplo frases de un video de fondo, publicidad, o algo sin "
    "sentido mecánico— NO respondas a esa frase ni inventes: pide "
    "amablemente al usuario, en español y segunda persona, que repita "
    "su consulta hablando claro, algo como 'No te entendí bien, "
    "¿puedes repetir tu consulta?'."
)

def _map_history(history: list[dict] = None):
    lc_history = []
    if history:
        for msg in history:
            if msg["role"] == "user":
                lc_history.append(HumanMessage(content=msg["content"]))
            else:
                lc_history.append(AIMessage(content=msg["content"]))
    return lc_history

def generate_answer(query: str, context_chunks: list[str], history: list[dict] = None, voice_mode: bool = False) -> str:
    """
    Función puente (Wrapper) para mantener la compatibilidad con el código viejo (voice/router.py).
    La lógica de procesamiento ahora se delega completamente a LangChain.
    El parámetro context_chunks se ignora porque LangChain busca su propio contexto usando herramientas.
    """
    lc_history = _map_history(history)

    # Solo en modo voz: anteponer la instrucción de "pedir repetir si no es
    # consulta de taller". Guard: si la query ya es una instrucción interna
    # (p.ej. SILENCIO_QUERY cuando is_silent), NO duplicar la instrucción.
    if voice_mode and not query.startswith("[INSTRUCCIÓN INTERNA"):
        query = f"{VOICE_MODE_INSTRUCTION}\n\nConsulta del usuario: {query}"

    try:
        response = pegasus_agent_executor.invoke(
            {"input": query, "chat_history": lc_history}
        )
        return response["output"]
    except Exception as e:
        print(f"Error en LangChain Agent (sync): {e}")
        return "Lo siento, tuve un problema interno procesando tu solicitud."

async def generate_answer_stream(query: str, context_chunks: list[str], history: list[dict] = None):
    """
    Función puente (Wrapper) para mantener la compatibilidad con el código viejo de chat en vivo (chat/router.py).
    """
    lc_history = _map_history(history)
    
    try:
        async for event in pegasus_agent_executor.astream_events(
            {"input": query, "chat_history": lc_history},
            version="v1"
        ):
            kind = event["event"]
            if kind == "on_chat_model_stream":
                delta = event["data"]["chunk"].content
                if delta and isinstance(delta, str):
                    yield delta
    except Exception as e:
        print(f"Error en LangChain Agent (stream): {e}")
        yield " Error procesando la solicitud."
