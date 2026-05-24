import asyncio
import asyncpg

variations = [
    "Juanchito0721!",
    "juanchito0721!",
    "Juanchito0721",
    "juanchito0721",
    "JUANCHITO0721!",
    "Juanchito0721!/",
    "Juanchito0721!/postgres",
    "Juanchito0721*",
    "juanchito0721*",
]

async def test_conn(password):
    host = "db.neoyeaeyysanelamruso.supabase.co"
    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(
                user="postgres",
                password=password,
                host=host,
                port=5432,
                database="postgres"
            ),
            timeout=4
        )
        print(f"-> SUCCESS WITH PASSWORD: {password}")
        await conn.close()
        return True
    except Exception as e:
        print(f"Testing '{password}': {type(e).__name__}")
        return False

async def main():
    for v in variations:
        if await test_conn(v):
            break

asyncio.run(main())
