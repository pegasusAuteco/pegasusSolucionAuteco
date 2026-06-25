"""
Audio message SQLAlchemy ORM model.

Defines the 'audio_messages' table for storing voice recordings
from user and assistant interactions.
"""
import datetime
import uuid

from sqlalchemy import Column, DateTime, LargeBinary, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class AudioMessage(Base):
    """
    ORM model for storing audio messages in PostgreSQL.

    Stores raw audio bytes with metadata for conversation association,
    user attribution, and MIME type for proper playback.
    """
    __tablename__ = "audio_messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False)
    role = Column(String, nullable=False)
    audio_data = Column(LargeBinary, nullable=False)
    mime_type = Column(String, default="audio/webm")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
