import sys
import os
from dotenv import load_dotenv

sys.path.append('/home/cohorte5/pegasusSolucionAuteco/backend')
load_dotenv('/home/cohorte5/pegasusSolucionAuteco/backend/.env')

from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
if not url or not key:
    print("No Supabase credentials")
    sys.exit(1)

supabase = create_client(url, key)
res = supabase.table("manuales_chunks").select("fuente").eq("pagina", 1).execute()
print(res.data)
