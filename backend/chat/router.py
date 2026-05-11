"""
Router principal del chat.
Gestiona conversaciones y mensajes. El endpoint de enviar mensaje
ejecuta el pipeline RAG completo (retrieval + generation).
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone
from uuid import uuid4

from jose import jwt, JWTError

from chat.models.schemas import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from rag.retrieval.retriever import retrieve_context
from rag.generation.generator import generate_answer
from logs.log_service import ConversationLogService
from config import settings

HISTORY_LIMIT = 10  # mensajes anteriores que se pasan al LLM como contexto

router = APIRouter(prefix="/chat", tags=["Chat"])
security = HTTPBearer()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


def get_log_service(request: Request) -> ConversationLogService:
    return request.app.state.log_service


def get_conversations_col(request: Request):
    return request.app.state.mongo_db["conversations"]


# ─── Endpoints de Conversaciones ──────────────────────────────────────────────

@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    user_id: str = Depends(get_current_user_id),
    col=Depends(get_conversations_col),
):
    """Lista las conversaciones del usuario autenticado."""
    cursor = col.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)
    return [
        {
            "id": d["id"],
            "title": d["title"],
            "user_id": d["user_id"],
            "created_at": d["created_at"],
            "updated_at": d["updated_at"],
        }
        for d in docs
    ]


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    body: ConversationCreate,
    user_id: str = Depends(get_current_user_id),
    log_service: ConversationLogService = Depends(get_log_service),
    col=Depends(get_conversations_col),
):
    """Crea una nueva conversación asociada al usuario autenticado."""
    now = _now()
    conv_id = str(uuid4())
    conv = {
        "id": conv_id,
        "title": body.title or "Nueva conversación",
        "user_id": user_id,
        "created_at": now,
        "updated_at": now,
    }
    await col.insert_one({**conv, "_id": conv_id})
    await log_service.create_session(mechanic_id=user_id, session_id=conv_id)
    return conv


@router.delete("/conversations", status_code=200)
async def delete_all_conversations(
    user_id: str = Depends(get_current_user_id),
    log_service: ConversationLogService = Depends(get_log_service),
    col=Depends(get_conversations_col),
):
    """Elimina todas las conversaciones del usuario autenticado."""
    docs = await col.find({"user_id": user_id}).to_list(length=1000)
    count = len(docs)
    await col.delete_many({"user_id": user_id})
    for doc in docs:
        try:
            await log_service.close_session(user_id, doc["id"])
        except Exception:
            pass
    print(f"🗑️ {count} conversaciones eliminadas para el usuario {user_id}")
    return {"deleted": count}


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def rename_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    user_id: str = Depends(get_current_user_id),
    col=Depends(get_conversations_col),
):
    """Renombra una conversación del usuario autenticado."""
    conv = await col.find_one({"id": conversation_id, "user_id": user_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    now = _now()
    await col.update_one(
        {"id": conversation_id},
        {"$set": {"title": body.title, "updated_at": now}},
    )
    return {**conv, "title": body.title, "updated_at": now}


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    log_service: ConversationLogService = Depends(get_log_service),
    col=Depends(get_conversations_col),
):
    """Elimina una conversación y su historial de mensajes."""
    conv = await col.find_one({"id": conversation_id, "user_id": user_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    await col.delete_one({"id": conversation_id})
    try:
        await log_service.close_session(user_id, conversation_id)
    except Exception:
        pass


# ─── Endpoints de Mensajes ────────────────────────────────────────────────────

@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def get_messages(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    log_service: ConversationLogService = Depends(get_log_service),
    col=Depends(get_conversations_col),
):
    """Retorna el historial completo de mensajes de una conversación del usuario."""
    conv = await col.find_one({"id": conversation_id, "user_id": user_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    return await log_service.get_context(
        mechanic_id=user_id, session_id=conversation_id, limit=200
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=201,
)
async def send_message(
    conversation_id: str,
    body: MessageCreate,
    user_id: str = Depends(get_current_user_id),
    log_service: ConversationLogService = Depends(get_log_service),
    col=Depends(get_conversations_col),
):
    """
    Recibe el mensaje del usuario y ejecuta el pipeline RAG completo:
    1. Guarda el mensaje del usuario en MongoDB/Redis
    2. Recupera el historial reciente para dar contexto al LLM
    3. Recupera chunks relevantes de manuales (vector search)
    4. Genera respuesta con GPT + historial + contexto RAG
    5. Guarda y retorna la respuesta del asistente
    """
    conv = await col.find_one({"id": conversation_id, "user_id": user_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    # 1. Guardar mensaje del usuario
    user_msg = {
        "id": str(uuid4()),
        "conversation_id": conversation_id,
        "role": "user",
        "content": body.content,
        "created_at": _now(),
    }
    await log_service.append_message(user_id, conversation_id, user_msg)

    # 2. Obtener historial reciente (sin el mensaje que acaba de guardarse)
    history = await log_service.get_context(
        user_id, conversation_id, limit=HISTORY_LIMIT + 1
    )
    history = history[:-1]  # excluir el mensaje actual que ya se pasa por separado

    # 3. RAG: recuperar chunks relevantes de manuales
    try:
        context_chunks = retrieve_context(body.content)
    except Exception as e:
        context_chunks = []
        print(f"⚠️ Error en retrieval: {e}")

    # 4. Generar respuesta con LLM + historial + contexto RAG
    try:
        answer = generate_answer(body.content, context_chunks, history=history)
    except Exception as e:
        answer = f"Lo siento, ocurrió un error al generar la respuesta: {str(e)}"
        print(f"⚠️ Error en generación: {e}")

    # 5. Guardar respuesta del asistente
    assistant_msg = {
        "id": str(uuid4()),
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": answer,
        "created_at": _now(),
    }
    await log_service.append_message(user_id, conversation_id, assistant_msg)

    # Actualizar título con la primera pregunta del usuario
    all_msgs = await log_service.get_context(user_id, conversation_id, limit=200)
    if len(all_msgs) == 2:
        title = body.content[:50] + ("..." if len(body.content) > 50 else "")
        await col.update_one(
            {"id": conversation_id},
            {"$set": {"title": title, "updated_at": _now()}},
        )

    return assistant_msg
