import asyncio
import asyncpg

regions = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "ca-central-1", "eu-west-1", "eu-west-2", "eu-west-3",
    "eu-central-1", "ap-southeast-1", "ap-southeast-2",
    "ap-northeast-1", "ap-northeast-2", "sa-east-1"
]

async def test_region(region):
    host = f"aws-0-{region}.pooler.supabase.com"
    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(
                user="postgres.neoyeaeyysanelamruso",
                password="Juanchito0721!",
                host=host,
                port=6543,
                database="postgres"
            ),
            timeout=3
        )
        print(f"!!! SUCCESS !!! Region: {region} (CONNECTED SUCCESSFULLY)")
        await conn.close()
        return True
    except asyncpg.exceptions.InvalidPasswordError:
        print(f"!!! MATCH !!! Region: {region} (Password incorrect but tenant found!)")
        return True
    except Exception as e:
        # User not found or other errors
        return False

async def main():
    print("Searching for correct pooler region...")
    for r in regions:
        if await test_region(r):
            print("Found correct region! Stopping search.")
            break
    else:
        print("Search complete. No region matched.")

asyncio.run(main())
