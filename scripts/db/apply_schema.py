"""
Aplica supabase/schema_usuarios.sql en la base de datos de Supabase.

"""
import asyncio
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD", "")

SQL_FILE = ROOT / "supabase" / "schema_usuarios.sql"


def _get_db_host() -> str:
    host = SUPABASE_URL.replace("https://", "").replace("http://", "")
    project_ref = host.split(".")[0]
    return f"db.{project_ref}.supabase.co"


async def apply_schema() -> None:
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL no está definida en .env")
    if not DB_PASSWORD:
        raise RuntimeError(
            "Error en variables de entorno .env\n"
        )

    db_host = _get_db_host()
    sql = SQL_FILE.read_text(encoding="utf-8")

    print(f"Conectando a {db_host}:5432 ...")
    conn = await asyncpg.connect(
        host=db_host,
        port=5432,
        user="postgres",
        password=DB_PASSWORD,
        database="postgres",
        ssl="require",
    )

    try:
        print("Aplicando schema_usuarios.sql ...")
        await conn.execute(sql)
        print("✓ Tablas creadas correctamente en Supabase.")

        row = await conn.fetchrow(
            "SELECT COUNT(*) as total FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'usuarios'"
        )
        if row["total"] == 1:
            print("✓ Tabla 'usuarios' verificada en la base de datos.")
        else:
            print("✗ No se encontró la tabla 'usuarios'. Revisa los logs.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(apply_schema())
