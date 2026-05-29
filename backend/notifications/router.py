from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class MessagePayload(BaseModel):
    cliente: str
    telefono: str
    correo: str
    placa: str
    mensaje: str

@router.post("/send")
async def send_notifications(payload: MessagePayload):
    print(f"📩 Enviando WhatsApp a {payload.telefono}: {payload.mensaje}")
    print(f"📧 Enviando Correo a {payload.correo}: {payload.mensaje}")
    return {"status": "success", "message": "Notificaciones procesadas correctamente"}
