from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Response model for a completed motorcycle record ─────────────────────────
# Mirrors every column of the motorcycles_completed table.
# Returned by POST /workshop/motorcycles/{id}/complete.
class MotorcycleCompletedResponse(BaseModel):
    id: str
    client_name: str
    client_id: str
    phone: Optional[str] = None
    email: Optional[str] = None
    model: str
    plate: str
    mileage: int
    observations: Optional[str] = None
    entry_date: datetime
    completed_at: datetime
    status: str
    whatsapp_sent: bool
