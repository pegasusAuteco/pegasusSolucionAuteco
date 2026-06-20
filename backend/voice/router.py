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


def _looks_like_noise(result) -> bool:
    """True si los segmentos de Whisper sugieren ruido / sin habla clara.

    Promedia las señales de confianza por segmento (no_speech_prob y
    avg_logprob). Umbrales conservadores para no marcar consultas reales
    como silencio. Si el SDK no expone segments, no decide (False).
    """
    import statistics

    segments = getattr(result, "segments", None) or []
    if not segments:
        return False

    no_speech = [getattr(s, "no_speech_prob", 0) for s in segments]
    logprobs = [getattr(s, "avg_logprob", 0) for s in segments]
    avg_no_speech = statistics.mean(no_speech) if no_speech else 0
    avg_logprob = statistics.mean(logprobs) if logprobs else 0

    # Alta probabilidad de no-habla O confianza media muy baja.
    return avg_no_speech > 0.6 or avg_logprob < -1.0


def _normalize_text(text: str) -> str:
    """Normaliza para comparar contra alucinaciones: minúsculas, sin signos
    de puntuación de apertura/cierre ni espacios sobrantes."""
    import re

    cleaned = text.lower().strip()
    cleaned = cleaned.strip("¡!¿?.…,;:\"'")
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


@lru_cache(maxsize=1)
def _whisper_prompt() -> str:
    """Vocabulario de dominio (lista de términos, NO frase) para sesgar la
    transcripción hacia las marcas de motos y evitar 'TVS'->'TBS'. Formato de
    lista para que Whisper no lo regurgite como transcripción en audio de baja
    calidad (las frases narrativas sí se regurgitan; las listas casi no)."""
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

    # ── Detección de audio silencioso / alucinaciones de Whisper ────────────────
    # Cuando el audio es silencio o ruido muy bajo, Whisper NO devuelve cadena
    # vacía: alucina textos conocidos (artefactos de su conjunto de entrenamiento).
    # El caso más frecuente en español es "Subtítulos realizados por la comunidad
    # de Amara.org", pero también frases típicas de YouTube ("Gracias por ver el
    # video", "Suscríbete al canal", etc.). Hay tres capas de detección:
    #   1) Igualdad exacta normalizada contra frases conocidas (frases cortas).
    #   2) Contención (substring) SOLO para frases largas y específicas, para no
    #      filtrar consultas reales que contengan una palabra suelta.
    #   3) Señales de confianza por segmento (no_speech_prob / avg_logprob).
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
        # Alucinaciones típicas de YouTube en español (forma normalizada:
        # minúsculas, sin signos ¡! ¿? ni puntuación de borde).
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
    # Frases largas/específicas que también atrapamos por contención (aunque
    # vengan rodeadas de otras alucinaciones). NO incluir palabras sueltas como
    # "suscríbete" o "hasta la próxima" que podrían aparecer en una pregunta real.
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
        # Regurgitaciones del prompt narrativo viejo de Whisper (audios en caché
        # o variantes). Frases largas y específicas: NUNCA "tvs"/"apache"/"raider"
        # sueltos, que son consultas legítimas.
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


    # Validar que la conversación pertenece al usuario si se proporcionó
    history = []
    user_audio_id = None
    if conversation_id:
        conv = await col.find_one({"id": conversation_id, "user_id": user_id})
        if not conv:
            raise HTTPException(status_code=404, detail="Conversación no encontrada")

        # Guardar audio/mensaje del usuario siempre para que aparezca en el chat
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

    # Guardar respuesta del asistente si hay conversación activa.
    # En caso de silencio NO guardamos el mensaje del usuario (ya filtrado arriba),
    # pero SÍ guardamos la respuesta del asistente para que aparezca en el chat.
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

        # Solo actualizar título si hubo mensaje real del usuario
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
