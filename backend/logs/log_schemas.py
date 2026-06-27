"""
Pydantic schemas for the logging API endpoints.

Defines request/response models for session creation, message appending,
and session context retrieval.
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class VoiceMessage(BaseModel):
    """Schema for a single message within a conversation session."""
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    input_type: Literal["voice", "text"] = "text"
    transcription_confidence: Optional[float] = None


class MotorcycleContext(BaseModel):
    """Optional motorcycle context attached to a conversation session."""
    brand: str
    model: str
    year: Optional[int] = None
    vin: Optional[str] = None


class SessionCreate(BaseModel):
    """Request schema for creating a new conversation session."""
    mechanic_id: str
    session_id: str
    motorcycle: Optional[MotorcycleContext] = None


class MessageAppend(BaseModel):
    """Request schema for appending a message to an existing session."""
    mechanic_id: str
    session_id: str
    message: VoiceMessage


class SessionResponse(BaseModel):
    """Response schema for a conversation session."""
    session_id: str
    mechanic_id: str
    started_at: str
    messages: list
    last_activity: str
