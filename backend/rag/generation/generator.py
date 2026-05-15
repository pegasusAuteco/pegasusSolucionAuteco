"""
Módulo de generación RAG.
Construye el prompt con los chunks recuperados y llama a GPT para generar la respuesta.
"""
from openai import OpenAI
from config import OPENAI_API_KEY, LLM_MODEL

_openai_client: OpenAI | None = None

SYSTEM_PROMPT = """Eres Pegasus, un motor de diagnóstico técnico para mecánicos expertos.
Tu función es entregar información de fallas aplicando estrictamente estas reglas:

1. CERO TEXTO DE RELLENO: Prohibido saludar, introducir, dar contexto o despedirse.
2. SIN EXPLICACIONES BÁSICAS: No expliques cómo hacer las pruebas, qué herramientas usar ni ubicaciones obvias.
3. ESTRUCTURA ESTANDARIZADA: Responde EXCLUSIVAMENTE con una lista de viñetas.
   Formato por viñeta: [Componente o Sistema]: [Acción técnica a realizar y/o valor esperado].
4. SOLUCIONES DE ÚLTIMO RECURSO: Pasos finales o reemplazos de piezas bajo el título "**Acción correctiva final:**".
5. BREVEDAD EXTREMA: Cada viñeta en una sola línea. Sin párrafos. Sin contaminación visual.

Si no hay datos técnicos, responde únicamente: "Sin datos técnicos."
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
        max_tokens=300,
    )

    return response.choices[0].message.content or "No pude generar una respuesta."
