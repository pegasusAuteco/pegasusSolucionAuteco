import base64
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from openai import OpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_session
from logs.log_service import ConversationLogService
from rag.generation.generator import generate_answer
from rag.retrieval.retriever import retrieve_context
from services import audio_service
from voice.tts_provider import synthesize_speech

HISTORY_LIMIT = 10

router = APIRouter(prefix="/voice", tags=["Voice"])
security = HTTPBearer()

_openai_client: OpenAI | None = None


def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


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


def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


@router.post("/transcribe")
async def transcribe_and_answer(
    audio: UploadFile = File(...),
    conversation_id: str | None = Query(default=None),
    user_id: str = Depends(get_current_user_id),
    log_service: ConversationLogService = Depends(get_log_service),
    col=Depends(get_conversations_col),
    session: AsyncSession = Depends(get_session),
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="El archivo de audio está vacío")

    client = _get_openai()
    try:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=(audio.filename or "audio.wav", audio_bytes, audio.content_type or "audio/wav"),
            language="es",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al transcribir: {str(e)}")

    transcription = result.text

    # Validar que la conversación pertenece al usuario si se proporcionó
    history = []
    user_audio_id = None
    if conversation_id:
        conv = await col.find_one({"id": conversation_id, "user_id": user_id})
        if not conv:
            raise HTTPException(status_code=404, detail="Conversación no encontrada")

        user_audio_id = await audio_service.save_audio(
            session=session,
            conversation_id=conversation_id,
            user_id=user_id,
            role="user",
            audio_bytes=audio_bytes,
            mime_type=audio.content_type or "audio/webm",
        )

        # Guardar mensaje del usuario
        user_msg = {
            "id": str(uuid4()),
            "conversation_id": conversation_id,
            "role": "user",
            "content": transcription,
            "created_at": _now(),
            "message_type": "voice",
            "audio_id": user_audio_id,
        }
        await log_service.append_message(user_id, conversation_id, user_msg)

        # Obtener historial reciente (sin el mensaje que acaba de guardarse)
        history = await log_service.get_context(
            user_id, conversation_id, limit=HISTORY_LIMIT + 1
        )
        history = history[:-1]

    # RAG: recuperar chunks relevantes
    try:
        context_chunks = retrieve_context(transcription)
    except Exception as e:
        context_chunks = []
        print(f"⚠️ Error en retrieval (voice): {e}")

    # Generar respuesta con LLM + historial + contexto RAG
    try:
        answer = generate_answer(transcription, context_chunks, history=history, voice_mode=True)
    except Exception as e:
        answer = f"Lo siento, ocurrió un error al generar la respuesta: {str(e)}"
        print(f"⚠️ Error en generación (voice): {e}")

    # TTS: sintetizar la respuesta
    tts_bytes = None
    audio_b64 = None
    try:
        tts_bytes = await synthesize_speech(answer)
        audio_b64 = base64.b64encode(tts_bytes).decode("utf-8")
    except Exception as e:
        print(f"⚠️ Error en TTS (voice): {e}")

    # Guardar respuesta del asistente si hay conversación activa
    if conversation_id:
        assistant_audio_id = None
        if tts_bytes:
            assistant_audio_id = await audio_service.save_audio(
                session=session,
                conversation_id=conversation_id,
                user_id=user_id,
                role="assistant",
                audio_bytes=tts_bytes,
                mime_type="audio/mpeg",
            )

        assistant_msg = {
            "id": str(uuid4()),
            "conversation_id": conversation_id,
            "role": "assistant",
            "content": answer,
            "created_at": _now(),
            "message_type": "voice",
            "audio_id": assistant_audio_id,
        }
        await log_service.append_message(user_id, conversation_id, assistant_msg)

        # Actualizar título con la primera pregunta si es el primer intercambio
        all_msgs = await log_service.get_context(user_id, conversation_id, limit=200)
        if len(all_msgs) == 2:
            title = transcription[:50] + ("..." if len(transcription) > 50 else "")
            await col.update_one(
                {"id": conversation_id},
                {"$set": {"title": title, "updated_at": _now()}},
            )

    return {"transcription": transcription, "response": answer, "audio": audio_b64}


@router.get("/audio/{audio_id}")
async def get_audio_file(
    audio_id: str,
    session: AsyncSession = Depends(get_session),
):
    record = await audio_service.get_audio(session, audio_id)
    if not record:
        raise HTTPException(status_code=404, detail="Audio no encontrado")
    return Response(
        content=record.audio_data,
        media_type=record.mime_type,
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=3600",
            "Content-Length": str(len(record.audio_data)),
        },
    )
