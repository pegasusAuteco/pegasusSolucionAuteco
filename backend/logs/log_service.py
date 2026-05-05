import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

FLUSH_THRESHOLD = 10
SESSION_TTL = 86400  # 24 hours


class ConversationLogService:
    def __init__(self, redis_client, mongo_db):
        self.redis = redis_client
        self.logs = mongo_db["conversation_logs"]

    def _key(self, mechanic_id: str, session_id: str) -> str:
        return f"session:{mechanic_id}:{session_id}"

    async def create_session(self, mechanic_id: str, session_id: str, motorcycle_context: dict = None):
        try:
            key = self._key(mechanic_id, session_id)
            session = {
                "mechanic_id": mechanic_id,
                "session_id": session_id,
                "started_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat(),
                "motorcycle": motorcycle_context,
                "messages": []
            }
            await self.redis.setex(key, SESSION_TTL, json.dumps(session))
            logger.info(f"Session created: {session_id} for mechanic {mechanic_id}")
            return session
        except Exception as e:
            logger.error(f"create_session error: {e}")
            raise

    async def append_message(self, mechanic_id: str, session_id: str, message: dict):
        try:
            key = self._key(mechanic_id, session_id)
            raw = await self.redis.get(key)
            if raw:
                session = json.loads(raw)
            else:
                session = await self.create_session(mechanic_id, session_id)
            session["messages"].append(message)
            session["last_activity"] = datetime.utcnow().isoformat()
            await self.redis.setex(key, SESSION_TTL, json.dumps(session))
            if len(session["messages"]) >= FLUSH_THRESHOLD:
                await self.flush_to_mongo(session)
            return session
        except Exception as e:
            logger.error(f"append_message error: {e}")
            raise

    async def flush_to_mongo(self, session: dict):
        try:
            await self.logs.update_one(
                {"session_id": session["session_id"]},
                {
                    "$push": {"messages": {"$each": session["messages"]}},
                    "$set": {
                        "mechanic_id": session["mechanic_id"],
                        "last_activity": session["last_activity"],
                        "started_at": session.get("started_at"),
                        "motorcycle": session.get("motorcycle"),
                    },
                    "$setOnInsert": {"created_at": datetime.utcnow().isoformat()}
                },
                upsert=True
            )
            logger.info(f"Flushed session {session['session_id']} to MongoDB")
        except Exception as e:
            logger.error(f"flush_to_mongo error: {e}")
            raise

    async def get_context(self, mechanic_id: str, session_id: str, limit: int = 20) -> list:
        try:
            key = self._key(mechanic_id, session_id)
            raw = await self.redis.get(key)
            if raw:
                session = json.loads(raw)
                return session["messages"][-limit:]
            # Fallback to MongoDB
            doc = await self.logs.find_one({"session_id": session_id})
            if doc:
                return doc.get("messages", [])[-limit:]
            return []
        except Exception as e:
            logger.error(f"get_context error: {e}")
            return []

    async def close_session(self, mechanic_id: str, session_id: str):
        try:
            key = self._key(mechanic_id, session_id)
            raw = await self.redis.get(key)
            if raw:
                session = json.loads(raw)
                await self.flush_to_mongo(session)
                await self.redis.delete(key)
                logger.info(f"Session {session_id} closed and persisted")
        except Exception as e:
            logger.error(f"close_session error: {e}")
            raise

    async def get_mechanic_history(self, mechanic_id: str, limit: int = 10) -> list:
        try:
            cursor = self.logs.find(
                {"mechanic_id": mechanic_id},
                {"messages": 0}
            ).sort("started_at", -1).limit(limit)
            return await cursor.to_list(length=limit)
        except Exception as e:
            logger.error(f"get_mechanic_history error: {e}")
            return []
