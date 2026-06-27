"""
Response generation module using the LangChain agent executor.

Provides synchronous and streaming answer generation with voice mode support.
The voice mode adds a safety instruction to handle transcription hallucinations.
"""
import asyncio
from langchain_core.messages import AIMessage, HumanMessage
from rag.core import pegasus_agent_executor

# Internal instruction prepended ONLY to voice queries (voice_mode=True).
# Acts as a safety net against transcription hallucinations that are not
# workshop queries (e.g. background video phrases) the list/confidence
# detection didn't catch: in that case Pegasus asks to repeat instead of inventing.
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
    """
    Converts message history from dict format to LangChain message objects.

    Maps 'user' role to HumanMessage and 'assistant' role to AIMessage.
    """
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
    Wrapper function for backward compatibility with voice/router.py.

    The actual processing logic is fully delegated to LangChain.
    The context_chunks parameter is ignored because LangChain searches
    for its own context using tools.

    In voice_mode, a safety instruction is prepended to handle transcription errors.
    """
    lc_history = _map_history(history)

    # Voice mode only: prepend the "ask to repeat if not a workshop query" instruction.
    # Guard: if the query is already an internal instruction (e.g. SILENCIO_QUERY when is_silent),
    # don't duplicate the instruction.
    if voice_mode and not query.startswith("[INSTRUCCIÓN INTERNA"):
        query = f"{VOICE_MODE_INSTRUCTION}\n\nConsulta del usuario: {query}"

    try:
        response = pegasus_agent_executor.invoke(
            {"input": query, "chat_history": lc_history}
        )
        return response["output"]
    except Exception as e:
        print(f"Error in LangChain Agent (sync): {e}")
        return "Lo siento, tuve un problema interno procesando tu solicitud."

async def generate_answer_stream(query: str, context_chunks: list[str], history: list[dict] = None):
    """
    Async generator wrapper for backward compatibility with live chat (chat/router.py).

    Yields text deltas as they arrive from the LangChain agent executor.
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
        print(f"Error in LangChain Agent (stream): {e}")
        yield " Error procesando la solicitud."
