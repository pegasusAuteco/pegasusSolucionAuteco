"""
Main chat router.

Manages conversations and messages. The send-message endpoint executes
the full RAG pipeline (retrieval + generation) and streams responses
via WebSocket for real-time chat.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone
from uuid import uuid4
import asyncio

from jose import jwt, JWTError

from chat.models.schemas import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from rag.retrieval.retriever import retrieve_context
from rag.generation.generator import generate_answer, generate_answer_stream
from logs.log_service import ConversationLogService
from config import settings

HISTORY_LIMIT = 10  # Previous messages passed to the LLM as context

router = APIRouter(prefix="/chat", tags=["Chat"])
security = HTTPBearer()


def _now() -> str:
    """Returns the current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    FastAPI dependency that extracts and validates the user ID from the JWT token.

    Raises:
        HTTPException: 401 if the token is invalid or expired.
    """
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
    """FastAPI dependency that retrieves the ConversationLogService from app state."""
    return request.app.state.log_service


def get_conversations_col(request: Request):
    """
    FastAPI dependency that retrieves the MongoDB conversations collection.

    Raises:
        HTTPException: 503 if MongoDB is not available.
    """
    if getattr(request.app.state, "mongo_db", None) is None:
        raise HTTPException(status_code=503, detail="Servicio de base de datos de chat no disponible (MongoDB).")
    return request.app.state.mongo_db["conversations"]


# ─── Conversation Endpoints ──────────────────────────────────────────────────

@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    user_id: str = Depends(get_current_user_id),
    col=Depends(get_conversations_col),
):
    """Lists all conversations for the authenticated user, sorted by most recent."""
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
    """Creates a new conversation associated with the authenticated user."""
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
    """Deletes all conversations for the authenticated user."""
    docs = await col.find({"user_id": user_id}).to_list(length=1000)
    count = len(docs)
    await col.delete_many({"user_id": user_id})
    for doc in docs:
        try:
            await log_service.close_session(user_id, doc["id"])
        except Exception:
            pass
    return {"deleted": count}


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def rename_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    user_id: str = Depends(get_current_user_id),
    col=Depends(get_conversations_col),
):
    """Renames a conversation belonging to the authenticated user."""
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
    """Deletes a conversation and its message history."""
    conv = await col.find_one({"id": conversation_id, "user_id": user_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    await col.delete_one({"id": conversation_id})
    try:
        await log_service.close_session(user_id, conversation_id)
    except Exception:
        pass


# ─── Message Endpoints ────────────────────────────────────────────────────────

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
    """Returns the full message history for a conversation."""
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
    Receives a user message and executes the full RAG pipeline:
    1. Saves the user message to MongoDB/Redis
    2. Retrieves recent history for LLM context
    3. Retrieves relevant manual chunks (vector search)
    4. Generates response with GPT + history + RAG context
    5. Saves and returns the assistant response
    """
    conv = await col.find_one({"id": conversation_id, "user_id": user_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    # 1. Save user message
    user_msg = {
        "id": str(uuid4()),
        "conversation_id": conversation_id,
        "role": "user",
        "content": body.content,
        "created_at": _now(),
    }
    await log_service.append_message(user_id, conversation_id, user_msg)

    # 2. Get recent history (excluding the message just saved)
    history = await log_service.get_context(
        user_id, conversation_id, limit=HISTORY_LIMIT + 1
    )
    history = history[:-1]  # Exclude current message (passed separately)

    # 3. RAG: retrieve relevant manual chunks
    try:
        context_chunks = retrieve_context(body.content)
    except Exception as e:
        context_chunks = []
        print(f"Error in retrieval: {e}")

    # 4. Generate response with LLM + history + RAG context
    try:
        answer = generate_answer(body.content, context_chunks, history=history)
    except Exception as e:
        answer = f"Lo siento, ocurrió un error al generar la respuesta: {str(e)}"
        print(f"Error in generation: {e}")

    # 5. Save assistant response
    assistant_msg = {
        "id": str(uuid4()),
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": answer,
        "created_at": _now(),
    }
    await log_service.append_message(user_id, conversation_id, assistant_msg)

    # Auto-title: use the first user message as conversation title
    all_msgs = await log_service.get_context(user_id, conversation_id, limit=200)
    if len(all_msgs) == 2:
        title = body.content[:50] + ("..." if len(body.content) > 50 else "")
        await col.update_one(
            {"id": conversation_id},
            {"$set": {"title": title, "updated_at": _now()}},
        )

    return assistant_msg


# ─── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/ws/{conversation_id}")
async def chat_websocket(
    conversation_id: str,
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    Bidirectional WebSocket for real-time chat with streaming.

    The JWT token is passed as a query parameter because browsers don't
    support custom headers in WebSocket handshakes.

    Message types:
    - 'message': Text message from user, triggers RAG pipeline with streaming tokens
    - 'audio' / 'image': Not yet implemented
    """
    # Verify JWT before accepting the connection
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id = payload["sub"]
    except JWTError:
        await websocket.close(code=1008)
        return

    log_service: ConversationLogService = websocket.app.state.log_service
    col = websocket.app.state.mongo_db["conversations"]

    conv = await col.find_one({"id": conversation_id, "user_id": user_id})
    if not conv:
        await websocket.accept()
        await websocket.close(code=4004)
        return

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "message":
                content = data.get("content", "")

                # Save user message
                user_msg = {
                    "id": str(uuid4()),
                    "conversation_id": conversation_id,
                    "role": "user",
                    "content": content,
                    "created_at": _now(),
                }
                await log_service.append_message(user_id, conversation_id, user_msg)

                # Get recent history
                history = await log_service.get_context(
                    user_id, conversation_id, limit=HISTORY_LIMIT + 1
                )
                history = history[:-1]

                # RAG: retrieval in a thread to avoid blocking the event loop
                try:
                    context_chunks = await asyncio.to_thread(retrieve_context, content)
                except Exception as e:
                    context_chunks = []
                    print(f"[ws] Error in retrieval: {e}")

                # Stream tokens to client
                full_answer = ""
                try:
                    async for delta in generate_answer_stream(content, context_chunks, history=history):
                        if delta is None:
                            break
                        full_answer += delta
                        await websocket.send_json({"type": "token", "content": delta})
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": str(e)})
                    print(f"[ws] Error in generation: {e}")
                    continue

                # Save assistant response
                assistant_msg_id = str(uuid4())
                assistant_msg = {
                    "id": assistant_msg_id,
                    "conversation_id": conversation_id,
                    "role": "assistant",
                    "content": full_answer,
                    "created_at": _now(),
                }
                await log_service.append_message(user_id, conversation_id, assistant_msg)

                # Auto-title: use the first user message as conversation title
                all_msgs = await log_service.get_context(user_id, conversation_id, limit=200)
                if len(all_msgs) == 2:
                    title = content[:50] + ("..." if len(content) > 50 else "")
                    await col.update_one(
                        {"id": conversation_id},
                        {"$set": {"title": title, "updated_at": _now()}},
                    )

                await websocket.send_json({"type": "done", "message_id": assistant_msg_id})

            elif msg_type in ("audio", "image"):
                await websocket.send_json({"type": "error", "message": "not implemented yet"})

    except WebSocketDisconnect:
        pass
