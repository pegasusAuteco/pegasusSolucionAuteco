"""
Punto de entrada principal del backend FastAPI.
Registra todos los routers y configura middleware.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import engine, Base
from auth.router import router as auth_router
from config import validate_config
from chat.router import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    from auth.models import User
    from logs.connections import get_redis, get_mongo_db
    from logs.log_service import ConversationLogService

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    redis = await get_redis()
    mongo_db = await get_mongo_db()
    app.state.log_service = ConversationLogService(redis, mongo_db)
    app.state.mongo_db = mongo_db

    yield

    await engine.dispose()
    await redis.aclose()

# Validar configuración al arrancar
validate_config()

app = FastAPI(
    title="Pegasus API",
    description="Agente IA con RAG para soporte técnico de motos Auteco",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # En producción: especifica el dominio del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    cleaned_errors = []
    for error in exc.errors():
        normalized_error = dict(error)
        ctx = normalized_error.get("ctx")
        if isinstance(ctx, dict):
            normalized_error["ctx"] = {
                key: str(value) if isinstance(value, Exception) else value
                for key, value in ctx.items()
            }
        cleaned_errors.append(normalized_error)
    return JSONResponse(status_code=400, content={"detail": cleaned_errors})


# Registrar routers
app.include_router(auth_router)
app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/")
async def root():
    return {"message": "Pegasus API - Asistente técnico Auteco", "docs": "/docs"}
