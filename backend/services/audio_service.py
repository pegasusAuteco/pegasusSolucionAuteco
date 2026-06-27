"""
Audio storage service for persisting voice messages.

Provides functions to save and retrieve audio files from the database,
used by the voice router to store user and assistant voice messages.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.audio_message import AudioMessage


async def save_audio(
    session: AsyncSession,
    conversation_id: str,
    user_id: str,
    role: str,
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
) -> str:
    """
    Saves an audio file to the database.

    Args:
        session: Async database session.
        conversation_id: The conversation this audio belongs to.
        user_id: The user who sent/received this audio.
        role: 'user' or 'assistant'.
        audio_bytes: Raw audio data.
        mime_type: MIME type (default: audio/webm).

    Returns:
        The UUID string of the saved audio record.
    """
    record = AudioMessage(
        conversation_id=conversation_id,
        user_id=user_id,
        role=role,
        audio_data=audio_bytes,
        mime_type=mime_type,
    )
    session.add(record)
    await session.commit()
    return str(record.id)


async def get_audio(session: AsyncSession, audio_id: str) -> AudioMessage | None:
    """
    Retrieves an audio record by its UUID.

    Returns None if not found.
    """
    result = await session.execute(
        select(AudioMessage).where(AudioMessage.id == uuid.UUID(audio_id))
    )
    return result.scalar_one_or_none()
