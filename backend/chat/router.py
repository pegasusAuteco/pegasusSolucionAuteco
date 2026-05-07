"""
Router principal del chat.
Gestiona conversaciones y mensajes. El endpoint de enviar mensaje
ejecuta el pipeline RAG completo (retrieval + generation).
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from uuid import uuid4

from chat.models.schemas import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from rag.retrieval.retriever import retrieve_context
from rag.generation.generator import generate_answer

router = APIRouter(prefix="/chat", tags=["Chat"])

# ─── Almacenamiento en memoria (temporal, sin DB) ─────────────────────────────
# En producción esto se reemplaza por PostgreSQL / Supabase
_conversations: dict[str, dict] = {}
_messages: dict[str, list[dict]] = {}   # conversation_id → list of messages


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Endpoints de Conversaciones ──────────────────────────────────────────────

@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations():
    """Lista todas las conversaciones (más recientes primero)."""
    convs = sorted(
        _conversations.values(),
        key=lambda c: c["created_at"],
        reverse=True,
    )
    return convs


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(body: ConversationCreate):
    """Crea una nueva conversación."""
    now = _now()
    conv = {
        "id": str(uuid4()),
        "title": body.title or "Nueva conversación",
        "user_id": "demo-user",   # Sin auth por ahora
        "created_at": now,
        "updated_at": now,
    }
    _conversations[conv["id"]] = conv
    _messages[conv["id"]] = []
    return conv


# ─── Endpoints de Mensajes ────────────────────────────────────────────────────

@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def get_messages(conversation_id: str):
    """Retorna el historial de mensajes de una conversación."""
    if conversation_id not in _conversations:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    return _messages.get(conversation_id, [])


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=201,
)
async def send_message(conversation_id: str, body: MessageCreate):
    """
    Recibe el mensaje del usuario y ejecuta el pipeline RAG completo:
    1. Guarda el mensaje del usuario
    2. Recupera contexto de Supabase (vector search)
    3. Genera respuesta con GPT
    4. Guarda y retorna la respuesta del asistente
    """
    if conversation_id not in _conversations:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    # 1. Guardar mensaje del usuario
    user_msg: dict = {
        "id": str(uuid4()),
        "conversation_id": conversation_id,
        "role": "user",
        "content": body.content,
        "created_at": _now(),
    }
    _messages[conversation_id].append(user_msg)

    # 2. RAG: recuperar chunks relevantes
    try:
        context_chunks = retrieve_context(body.content)
    except Exception as e:
        context_chunks = []
        print(f"⚠️ Error en retrieval: {e}")

    # 3. Generar respuesta con LLM
    try:
        answer = generate_answer(body.content, context_chunks)
    except Exception as e:
        answer = f"Lo siento, ocurrió un error al generar la respuesta: {str(e)}"
        print(f"⚠️ Error en generación: {e}")

    # 4. Guardar y retornar la respuesta del asistente
    assistant_msg: dict = {
        "id": str(uuid4()),
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": answer,
        "created_at": _now(),
    }
    _messages[conversation_id].append(assistant_msg)

    # Actualizar título de la conversación con la primera pregunta
    if len(_messages[conversation_id]) == 2:  # Primer intercambio
        title = body.content[:50] + ("..." if len(body.content) > 50 else "")
        _conversations[conversation_id]["title"] = title

    return assistant_msg
