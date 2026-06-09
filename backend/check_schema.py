import asyncio
from sqlalchemy import text
from database import engine

async def check():
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'motorcycles'"))
        columns = result.fetchall()
        print("motorcycles schema:", columns)
        
        result2 = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'manuales_chunks'"))
        columns2 = result2.fetchall()
        print("manuales_chunks schema:", columns2)

if __name__ == "__main__":
    asyncio.run(check())
