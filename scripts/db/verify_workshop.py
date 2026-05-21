"""
Verifies that the workshop tables (motorcycles, parts) exist in PostgreSQL.

Run from the project root after `docker compose up -d`:
    python scripts/db/verify_workshop.py

Connection: uses DB_USER / DB_PASSWORD / DB_NAME / DB_HOST / DB_PORT from .env.
DB_HOST defaults to localhost, DB_PORT defaults to 5433 (Docker-mapped port).
"""
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT / ".env")

DB_USER = os.getenv("DB_USER", "motorconnect")
DB_PASSWORD = os.getenv("DB_PASSWORD", "localdev123")
DB_NAME = os.getenv("DB_NAME", "motorconnect_db")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5433"))

WORKSHOP_TABLES = ["motorcycles", "parts"]

QUERY = """
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = ANY($1::text[]);
"""


async def main() -> None:
    try:
        import asyncpg
    except ImportError:
        print("Error: asyncpg is not installed. Run: pip install asyncpg")
        sys.exit(1)

    dsn = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    print(f"Connecting to {DB_HOST}:{DB_PORT}/{DB_NAME} ...")

    try:
        conn = await asyncpg.connect(dsn)
    except Exception as exc:
        print(f"Connection failed: {exc}")
        print("\nMake sure the Docker services are running:")
        print("  docker compose up -d")
        sys.exit(1)

    try:
        rows = await conn.fetch(QUERY, WORKSHOP_TABLES)
        found = {r["table_name"] for r in rows}
        missing = [t for t in WORKSHOP_TABLES if t not in found]

        if not missing:
            for table in WORKSHOP_TABLES:
                count = await conn.fetchval(f'SELECT COUNT(*) FROM "{table}"')
                print(f"Table '{table}' verified — {count} row(s).")
            return

        print(f"Missing tables: {missing}")
        print("\nTables are created automatically on backend startup via SQLAlchemy.")
        print("Start the backend to apply the schema:")
        print("  docker compose up -d --build")
        print("  # or locally:")
        print("  cd backend && uvicorn main:app --reload")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
