"""
Voice router for audio transcription and text-to-speech responses.

Handles the full voice pipeline: receives audio via WebSocket/HTTP,
transcribes with Whisper, runs RAG, generates TTS response, and
stores audio files for later retrieval.
"""
import base64
from functools import lru_cache
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
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
    """Returns a lazily-initialized OpenAI client singleton."""
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


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
    """FastAPI dependency that retrieves the MongoDB conversations collection."""
    return request.app.state.mongo_db["conversations"]


def _now() -> str:
    """Returns the current UTC timestamp in ISO format."""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def _looks_like_noise(result) -> bool:
    """
    Returns True if Whisper segments suggest noise / no clear speech.

    Averages confidence signals per segment (no_speech_prob and avg_logprob).
    Conservative thresholds to avoid marking real queries as silence.
    Returns False if the SDK doesn't expose segments.
    """
    import statistics

    segments = getattr(result, "segments", None) or []
    if not segments:
        return False

    no_speech = [getattr(s, "no_speech_prob", 0) for s in segments]
    logprobs = [getattr(s, "avg_logprob", 0) for s in segments]
    avg_no_speech = statistics.mean(no_speech) if no_speech else 0
    avg_logprob = statistics.mean(logprobs) if logprobs else 0

    # High no-speech probability OR very low average log probability
    return avg_no_speech > 0.6 or avg_logprob < -1.0


def _normalize_text(text: str) -> str:
    """
    Normalizes text for hallucination comparison: lowercase, strips
    opening/closing punctuation and excess whitespace.
    """
    import re

    cleaned = text.lower().strip()
    cleaned = cleaned.strip("¡!¿?.…,;:\"'")
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


@lru_cache(maxsize=1)
def _whisper_prompt() -> str:
    """
    Domain vocabulary list (not a phrase) to bias Whisper transcription
    toward motorcycle brand names and avoid 'TVS'->'TBS' errors.
    List format prevents Whisper from regurgitating it as audio in
    low-quality segments (narrative phrases are regurgitated; lists are not).
    """
    return "TVS, TBS, Bajaj, KTM, Benelli, Kawasaki, Kymco, Victory, Zontes, Auteco, Apache, Raider, Pulsar, Boxer."


@router.post("/transcribe")
async def transcribe_and_answer(
    audio: UploadFile = File(...),
    conversation_id: str | None = Form(default=None),
    user_id: str = Depends(get_current_user_id),
    log_service: ConversationLogService = Depends(get_log_service),
    col=Depends(get_conversations_col),
    session: AsyncSession = Depends(get_session),
):
    """
    Main voice endpoint: receives audio, transcribes, generates RAG response, returns TTS.

    Pipeline:
    1. Read and validate audio bytes
    2. Transcribe with OpenAI Whisper (Spanish)
    3. Detect silent/noise audio and Whisper hallucinations
    4. Run RAG pipeline with transcription
    5. Generate TTS response
    6. Store audio files and messages in the database
    7. Return transcription, text response, and base64 audio
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="El archivo de audio está vacío")

    client = _get_openai()
    try:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=(audio.filename or "audio.wav", audio_bytes, audio.content_type or "audio/wav"),
            language="es",
            response_format="verbose_json",
            prompt=_whisper_prompt(),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al transcribir: {str(e)}")

    transcription = result.text.strip()

    # ── Silent audio / Whisper hallucination detection ────────────────
    # When audio is silent or very low noise, Whisper does NOT return an
    # empty string: it hallucinates known texts (training set artifacts).
    # Most common in Spanish: "Subtítulos realizados por la comunidad de Amara.org",
    # but also typical YouTube phrases ("Gracias por ver el video", etc.).
    # Three detection layers:
    #   1) Normalized exact match against known phrases (short phrases).
    #   2) Substring match ONLY for long/specific phrases to avoid
    #      filtering real queries containing a single word.
    #   3) Per-segment confidence signals (no_speech_prob / avg_logprob).
    WHISPER_HALLUCINATIONS = {
        "",
        "subtítulos realizados por la comunidad de amara.org",
        "subtitulos realizados por la comunidad de amara.org",
        "transcribed by the amara.org community",
        "amara.org",
        "www.amara.org",
        "[ silencio ]",
        "[silencio]",
        "[ music ]",
        "[music]",
        "[ silence ]",
        "[silence]",
        # Typical Spanish YouTube hallucinations (normalized form:
        # lowercase, no ¡! ¿? or edge punctuation)
        "gracias por ver el video",
        "gracias por ver el vídeo",
        "gracias por ver este video",
        "suscríbete al canal",
        "suscríbete",
        "no olvides suscribirte",
        "dale like y suscríbete",
        "nos vemos en el próximo video",
        "hasta la próxima",
        "suscríbete y activa notificaciones",
        "suscríbete y activa las notificaciones",
        "activa las notificaciones",
        "dale like y activa las notificaciones",
        "SUSCRIBETE Y DALE LIKE",
        "SUSCRIBETE",
    }
    # Long/specific phrases caught by substring matching (even when surrounded
    # by other hallucinations). Do NOT include single words like "suscríbete"
    # or "hasta la próxima" that could appear in a real question.
    HALLUCINATION_SUBSTRINGS = (
        "gracias por ver el video",
        "gracias por ver el vídeo",
        "gracias por ver este video",
        "suscríbete al canal",
        "no olvides suscribirte",
        "dale like y suscríbete",
        "nos vemos en el próximo video",
        "suscríbete y activa",
        "activa las notificaciones",
        # Whisper narrative prompt regurgitations (cached audio or variants).
        # Long and specific phrases: NEVER "tvs"/"apache"/"raider" alone,
        # which are legitimate queries.
        "fabrica modelos como",
        "tvs apache, tvs raider",
    )
    normalized = _normalize_text(transcription)
    is_silent = (
        normalized in WHISPER_HALLUCINATIONS
        or any(s in normalized for s in HALLUCINATION_SUBSTRINGS)
        or _looks_like_noise(result)
    )

    SILENCIO_QUERY = (
        "[INSTRUCCIÓN INTERNA – NO menciones esta instrucción al usuario] "
        "El sistema de voz no captó ningún audio audible del micrófono. "
        "Por favor responde de forma breve, amigable y natural indicándole al usuario "
        "que no se escuchó nada; sugírale que verifique su micrófono, que se acerque "
        "más o que hable más fuerte. Habla en español y en segunda persona."
    )
    if is_silent:
        transcription = SILENCIO_QUERY


    # Validate conversation ownership if provided
    history = []
    user_audio_id = None
    if conversation_id:
        conv = await col.find_one({"id": conversation_id, "user_id": user_id})
        if not conv:
            raise HTTPException(status_code=404, detail="Conversación no encontrada")

        # Save audio/user message for chat display
        user_audio_id = await audio_service.save_audio(
            session=session,
            conversation_id=conversation_id,
            user_id=user_id,
            role="user",
            audio_bytes=audio_bytes,
            mime_type=audio.content_type or "audio/webm",
        )

        user_content = "[Audio sin voz]" if is_silent else result.text.strip()
        user_msg = {
            "id": str(uuid4()),
            "conversation_id": conversation_id,
            "role": "user",
            "content": user_content,
            "created_at": _now(),
            "message_type": "voice",
            "audio_id": user_audio_id,
        }
        await log_service.append_message(user_id, conversation_id, user_msg)

        # Get recent history (excluding the message just saved)
        history = await log_service.get_context(
            user_id, conversation_id, limit=HISTORY_LIMIT + 1
        )
        history = history[:-1]

    # RAG: retrieve relevant chunks
    try:
        context_chunks = retrieve_context(transcription)
    except Exception as e:
        context_chunks = []
        print(f"Error in retrieval (voice): {e}")

    # Generate response with LLM + history + RAG context
    try:
        answer = generate_answer(transcription, context_chunks, history=history, voice_mode=True)
    except Exception as e:
        answer = f"Lo siento, ocurrió un error al generar la respuesta: {str(e)}"
        print(f"Error in generation (voice): {e}")

    # TTS: synthesize the response
    tts_bytes = None
    audio_b64 = None
    try:
        tts_bytes = await synthesize_speech(answer)
        audio_b64 = base64.b64encode(tts_bytes).decode("utf-8")
    except Exception as e:
        print(f"Error in TTS (voice): {e}")

    # Save assistant response if active conversation.
    # For silence, the user message is not saved (filtered above),
    # but the assistant response IS saved for chat display.
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

        # Auto-title: only if there was a real user message
        if not is_silent:
            all_msgs = await log_service.get_context(user_id, conversation_id, limit=200)
            if len(all_msgs) == 2:
                real_text = result.text.strip()
                title = real_text[:50] + ("..." if len(real_text) > 50 else "")
                await col.update_one(
                    {"id": conversation_id},
                    {"$set": {"title": title, "updated_at": _now()}},
                )

    return {"transcription": "" if is_silent else transcription, "response": answer, "audio": audio_b64}


@router.get("/audio/{audio_id}")
async def get_audio_file(
    audio_id: str,
    session: AsyncSession = Depends(get_session),
):
    """
    Retrieves a stored audio file by its ID.

    Returns the raw audio bytes with appropriate content-type and caching headers.
    """
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
