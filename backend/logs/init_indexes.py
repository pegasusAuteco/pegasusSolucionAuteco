"""
Run this script once to initialize MongoDB indexes for conversation_logs.
Usage: python -m logs.init_indexes
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import DESCENDING


async def create_indexes():
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME", "motorconnect_logs")
    client = AsyncIOMotorClient(uri)
    collection = client[db_name]["conversation_logs"]

    await collection.create_index([("mechanic_id", 1), ("started_at", DESCENDING)])
    await collection.create_index([("session_id", 1)], unique=True)
    await collection.create_index([("motorcycle.model", 1)])
    await collection.create_index([("tags", 1)])
    # TTL: auto-delete logs older than 1 year
    await collection.create_index([("started_at", 1)], expireAfterSeconds=31536000)

    print("MongoDB indexes created successfully.")
    client.close()


if __name__ == "__main__":
    asyncio.run(create_indexes())
