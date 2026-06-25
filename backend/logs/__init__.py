"""
Logging module for conversation sessions.

Uses a dual-storage architecture: Redis for active sessions (fast reads/writes)
and MongoDB for persistent storage. Messages are buffered in Redis and flushed
to MongoDB every 10 messages or when the session is closed.
"""