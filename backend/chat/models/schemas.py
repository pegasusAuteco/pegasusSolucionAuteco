"""
Pydantic schemas for the chat module.

Defines request/response models for conversations and messages,
used by both REST endpoints and WebSocket handlers.
"""
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4


class ConversationCreate(BaseModel):
    """Request schema for creating a new conversation."""
    title: str | None = None


class ConversationUpdate(BaseModel):
    """Request schema for renaming a conversation."""
    title: str


class ConversationResponse(BaseModel):
    """Response schema for a conversation object."""
    id: str
    title: str
    user_id: str
    created_at: str
    updated_at: str


class MessageCreate(BaseModel):
    """Request schema for sending a new message."""
    content: str


class MessageResponse(BaseModel):
    """
    Response schema for a chat message.

    Fields:
    - audio_id: ID of the associated audio file (for voice messages)
    - message_type: 'text' or 'voice'
    """
    id: str
    conversation_id: str
    role: str   # 'user' | 'assistant'
    content: str
    created_at: str
    audio_id: str | None = None
    message_type: str | None = None
