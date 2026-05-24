import asyncio
import asyncpg

async def test():
    print("Testing connection to sa-east-1 pooler...")
    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(
                user="postgres.neoyeaeyysanelamruso",
                password="Juanchito0721!",
                host="aws-0-sa-east-1.pooler.supabase.com",
                port=6543,
                database="postgres"
            ),
            timeout=5
        )
        print("-> CONNECTED TO SA-EAST-1 POOLER SUCCESSFULLY!")
        await conn.close()
        return True
    except Exception as e:
        print(f"-> FAILED: {type(e).__name__}: {e}")
        return False

asyncio.run(test())
