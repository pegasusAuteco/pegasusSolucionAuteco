from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_session
from auth.models import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/admin", summary="Obtener métricas reales del administrador")
async def get_admin_stats(request: Request, db: AsyncSession = Depends(get_session)):
    try:
        # 1. Total usuarios (Postgres)
        stmt = select(func.count()).select_from(User)
        total_users = await db.scalar(stmt)
        
        # 2. Base de datos MongoDB
        mongo_db = request.app.state.mongo_db
        if mongo_db is None:
            # Fallback en caso de que Mongo no esté disponible
            return {
                "total_users": total_users,
                "total_conversations": 0,
                "total_messages": 0
            }
        
        logs_collection = mongo_db["conversation_logs"]
        
        # 3. Total conversaciones
        total_conversations = await logs_collection.count_documents({})
        
        # 4. Total mensajes (Aggregation Pipeline)
        pipeline = [
            {
                "$project": {
                    "msg_count": {"$size": {"$ifNull": ["$messages", []]}}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$msg_count"}
                }
            }
        ]
        
        result = await logs_collection.aggregate(pipeline).to_list(1)
        total_messages = result[0]["total"] if result else 0
        
        return {
            "total_users": total_users or 0,
            "total_conversations": total_conversations or 0,
            "total_messages": total_messages or 0
        }
        
    except Exception as e:
        logger.error(f"Error en admin stats: {e}")
        raise HTTPException(status_code=500, detail="Error al calcular métricas del administrador")
