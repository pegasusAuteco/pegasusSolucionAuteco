"""Modelos Pydantic para el módulo de chat."""
from pydantic import BaseModel
from datetime import datetime
from uuid import uuid4


class ConversationCreate(BaseModel):
    title: str | None = None


class ConversationResponse(BaseModel):
    id: str
    title: str
    user_id: str
    created_at: str
    updated_at: str


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str   # 'user' | 'assistant'
    content: str
    created_at: str
