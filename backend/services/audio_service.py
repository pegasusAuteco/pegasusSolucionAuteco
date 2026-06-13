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
    result = await session.execute(
        select(AudioMessage).where(AudioMessage.id == uuid.UUID(audio_id))
    )
    return result.scalar_one_or_none()
