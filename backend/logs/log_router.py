# ============================================================
# INTEGRATION NOTE FOR BACKEND DEVELOPER:
# Add the following lines to backend/main.py:
#
#   from logs.log_router import router as logs_router
#   app.include_router(logs_router, prefix="/api/logs", tags=["logs"])
#
# ============================================================
from fastapi import APIRouter, HTTPException
from .log_schemas import SessionCreate, MessageAppend, SessionResponse
from .connections import get_redis, get_mongo_db
from .log_service import ConversationLogService

router = APIRouter()


async def get_service() -> ConversationLogService:
    redis = await get_redis()
    mongo = await get_mongo_db()
    return ConversationLogService(redis, mongo)


@router.post("/session", response_model=dict, summary="Create a new conversation session")
async def create_session(payload: SessionCreate):
    try:
        service = await get_service()
        motorcycle = payload.motorcycle.model_dump() if payload.motorcycle else None
        session = await service.create_session(payload.mechanic_id, payload.session_id, motorcycle)
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/message", response_model=dict, summary="Append a message to a session")
async def append_message(payload: MessageAppend):
    try:
        service = await get_service()
        session = await service.append_message(
            payload.mechanic_id,
            payload.session_id,
            payload.message.model_dump()
        )
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/context/{mechanic_id}/{session_id}", summary="Get active session context")
async def get_context(mechanic_id: str, session_id: str, limit: int = 20):
    try:
        service = await get_service()
        messages = await service.get_context(mechanic_id, session_id, limit)
        return {"session_id": session_id, "messages": messages, "count": len(messages)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/session/{mechanic_id}/{session_id}", summary="Close session and persist to MongoDB")
async def close_session(mechanic_id: str, session_id: str):
    try:
        service = await get_service()
        await service.close_session(mechanic_id, session_id)
        return {"status": "closed", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{mechanic_id}", summary="Get all sessions for a mechanic")
async def get_mechanic_history(mechanic_id: str, limit: int = 10):
    try:
        service = await get_service()
        history = await service.get_mechanic_history(mechanic_id, limit)
        # Remove MongoDB _id (not JSON serializable)
        for item in history:
            item.pop("_id", None)
        return {"mechanic_id": mechanic_id, "sessions": history, "count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
