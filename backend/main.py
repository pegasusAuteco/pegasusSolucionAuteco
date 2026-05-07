"""
Punto de entrada principal del backend FastAPI.
Registra todos los routers y configura middleware.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import validate_config
from chat.router import router as chat_router

# Validar configuración al arrancar
validate_config()

app = FastAPI(
    title="Pegasus API",
    description="Agente IA con RAG para soporte técnico de motos Auteco",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # En producción: especifica el dominio del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
# Nota: Vite proxy reescribe /api → / en el backend
# Por eso el router usa el prefix /chat directamente (ya definido en el router)
app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
async def root():
    return {"message": "Pegasus API - Asistente técnico Auteco", "docs": "/docs"}
