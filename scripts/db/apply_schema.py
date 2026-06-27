"""
Verify and apply supabase/schema_usuarios.sql to Supabase.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SQL_FILE = ROOT / "supabase" / "schema_usuarios.sql"


def get_client() -> Client:
    """Create and return a Supabase client using env credentials. Exits on missing config."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
        sys.exit(1)
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def tabla_existe(supabase: Client) -> bool:
    """Check if the 'usuarios' table exists by attempting a lightweight query."""
    try:
        supabase.table("usuarios").select("id").limit(1).execute()
        return True
    except Exception as e:
        msg = str(e)
        if "PGRST205" in msg or "42P01" in msg or "does not exist" in msg.lower() or "schema cache" in msg.lower():
            return False
        raise


def main():
    """Verify the usuarios table; if missing, print the SQL schema for manual execution."""
    supabase = get_client()
    print(f"Connecting to {SUPABASE_URL} ...")

    if tabla_existe(supabase):
        result = supabase.table("usuarios").select("id", count="exact").execute()
        total = result.count if result.count is not None else "?"
        print(f"Table 'usuarios' verified — {total} row(s).")
        return

    print("Table 'usuarios' not found.")
    print("Run the following SQL in the Supabase SQL Editor:\n")
    print("=" * 60)
    print(SQL_FILE.read_text(encoding="utf-8"))
    print("=" * 60)
    project_ref = SUPABASE_URL.replace("https://", "").split(".")[0]
    print(f"\nhttps://supabase.com/dashboard/project/{project_ref}/sql/new")


if __name__ == "__main__":
    main()
