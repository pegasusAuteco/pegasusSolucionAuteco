import os
import logging
import redis.asyncio as aioredis
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)


async def get_redis():
    url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    try:
        client = aioredis.from_url(url, decode_responses=True)
        await client.ping()
        logger.info("Redis connection established")
        return client
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")
        raise


async def get_mongo_db():
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "motorconnect_logs")
    try:
        client = AsyncIOMotorClient(uri)
        db = client[db_name]
        logger.info(f"MongoDB connection established — db: {db_name}")
        return db
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise
