from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class VoiceMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    input_type: Literal["voice", "text"] = "text"
    transcription_confidence: Optional[float] = None


class MotorcycleContext(BaseModel):
    brand: str
    model: str
    year: Optional[int] = None
    vin: Optional[str] = None


class SessionCreate(BaseModel):
    mechanic_id: str
    session_id: str
    motorcycle: Optional[MotorcycleContext] = None


class MessageAppend(BaseModel):
    mechanic_id: str
    session_id: str
    message: VoiceMessage


class SessionResponse(BaseModel):
    session_id: str
    mechanic_id: str
    started_at: str
    messages: list
    last_activity: str
