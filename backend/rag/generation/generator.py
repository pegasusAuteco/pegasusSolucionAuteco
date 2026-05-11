"""
Módulo de generación RAG.
Construye el prompt con los chunks recuperados y llama a GPT para generar la respuesta.
"""
from openai import OpenAI
from config import OPENAI_API_KEY, LLM_MODEL

_openai_client: OpenAI | None = None

SYSTEM_PROMPT = """Eres Pegasus, un asistente experto y amigable especializado en motos Auteco.
Tu función es ayudar a mecánicos y técnicos a resolver dudas sobre mantenimiento, 
reparación y diagnóstico de motos, apoyándote en la información de los manuales técnicos.

Reglas:
- Responde siempre en español y sé cordial. Si el usuario te saluda o es conversacional, respóndele de manera amable antes de pasar al tema técnico.
- Para consultas técnicas, sé preciso, técnico y conciso, y básate en el contexto proporcionado.
- Si te hacen una consulta técnica y la información no está en el contexto, dilo claramente: "No encontré esa información específica en los manuales disponibles."
- Cita los pasos numerados cuando expliques procedimientos.
- No inventes especificaciones técnicas (torques, medidas, etc).
"""


def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=OPENAI_API_KEY)
    return _openai_client


def build_rag_prompt(query: str, context_chunks: list[str]) -> str:
    """Construye el prompt de usuario con el contexto de los manuales (si existe)."""
    if context_chunks:
        context = "\n\n---\n\n".join(context_chunks)
        return (
            f"Consulta del usuario: {query}\n\n"
            f"Contexto relevante extraído de los manuales técnicos:\n{context}\n\n"
            f"Por favor, responde a la consulta del usuario utilizando el contexto anterior si es pertinente."
        )
    else:
        return f"Consulta del usuario: {query}"


def generate_answer(
    query: str,
    context_chunks: list[str],
    history: list[dict] | None = None,
) -> str:
    client = _get_openai()
    user_prompt = build_rag_prompt(query, context_chunks)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if history:
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_prompt})

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=1024,
    )

    return response.choices[0].message.content or "No pude generar una respuesta."
