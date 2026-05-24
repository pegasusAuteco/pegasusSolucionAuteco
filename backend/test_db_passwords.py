import asyncio
import asyncpg

passwords = [
    "Juanchito0721!",
    "Juanchito0721!/",
    "Juanchito0721!/postgres",
]

async def test_conn(user, password, host, port, database):
    print(f"Testing: postgresql://{user}:{password}@{host}:{port}/{database}")
    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(
                user=user,
                password=password,
                host=host,
                port=port,
                database=database
            ),
            timeout=5
        )
        print("-> SUCCESSFUL CONNECTION!")
        await conn.close()
        return True
    except Exception as e:
        print(f"-> FAILED: {type(e).__name__}: {e}")
        return False

async def main():
    host_pooler = "aws-0-us-east-1.pooler.supabase.com"
    host_direct = "db.neoyeaeyysanelamruso.supabase.co"
    
    print("=== TESTING CONNECTION POOLER (Port 6543) ===")
    for p in passwords:
        await test_conn(
            user="postgres.neoyeaeyysanelamruso",
            password=p,
            host=host_pooler,
            port=6543,
            database="postgres"
        )
        
    print("\n=== TESTING DIRECT CONNECTION (Port 5432) ===")
    for p in passwords:
        await test_conn(
            user="postgres",
            password=p,
            host=host_direct,
            port=5432,
            database="postgres"
        )

asyncio.run(main())
