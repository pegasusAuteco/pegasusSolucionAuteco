import asyncio
import asyncpg

async def test():
    host = "db.neoyeaeyysanelamruso.supabase.co"
    print("Testing connection on port 6543...")
    for user in ["postgres", "postgres.neoyeaeyysanelamruso"]:
        try:
            conn = await asyncio.wait_for(
                asyncpg.connect(
                    user=user,
                    password="Juanchito0721!",
                    host=host,
                    port=6543,
                    database="postgres"
                ),
                timeout=4
            )
            print(f"-> SUCCESS WITH USER: {user} on port 6543")
            await conn.close()
            return
        except Exception as e:
            print(f"-> FAILED user {user} on port 6543: {type(e).__name__}: {e}")

asyncio.run(test())
