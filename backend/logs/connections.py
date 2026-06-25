"""
Async connection factories for Redis and MongoDB.

Provides lazy-initialization functions that create and return
async clients for the logging infrastructure.
"""
import os
import logging
import redis.asyncio as aioredis
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)


async def get_redis():
    """
    Creates an async Redis client connected to REDIS_URL.

    Returns a client with decode_responses=True for string-based session data.
    Raises on connection failure.
    """
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
    """
    Creates an async MongoDB client connected to MONGO_URI.

    Returns the database instance specified by MONGO_DB_NAME.
    Detects Atlas vs local MongoDB to set appropriate timeout.
    """
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "motorconnect_logs")
    try:
        is_atlas = "mongodb+srv" in uri or "mongodb.net" in uri
        if is_atlas:
            client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=30000)
        else:
            client = AsyncIOMotorClient(uri)
        db = client[db_name]
        logger.info(f"MongoDB connection established — db: {db_name}")
        return db
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise
