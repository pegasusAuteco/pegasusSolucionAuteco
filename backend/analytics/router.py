"""
Analytics router for admin dashboard metrics.

Aggregates real-time statistics from PostgreSQL (users) and MongoDB
(conversations, messages) for the admin dashboard.
"""
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_session
from auth.models import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/admin", summary="Get real-time admin metrics")
async def get_admin_stats(request: Request, db: AsyncSession = Depends(get_session)):
    """
    Returns aggregated admin dashboard metrics.

    Metrics:
    - total_users: Count from PostgreSQL users table
    - total_conversations: Count from MongoDB conversation_logs
    - total_messages: Sum of all message arrays across conversations
    """
    try:
        # 1. Total users (PostgreSQL)
        stmt = select(func.count()).select_from(User)
        total_users = await db.scalar(stmt)
        
        # 2. MongoDB database
        mongo_db = request.app.state.mongo_db
        if mongo_db is None:
            # Fallback if MongoDB is not available
            return {
                "total_users": total_users,
                "total_conversations": 0,
                "total_messages": 0
            }
        
        logs_collection = mongo_db["conversation_logs"]
        
        # 3. Total conversations
        total_conversations = await logs_collection.count_documents({})
        
        # 4. Total messages (Aggregation Pipeline)
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
        logger.error(f"Error in admin stats: {e}")
        raise HTTPException(status_code=500, detail="Error al calcular métricas del administrador")
