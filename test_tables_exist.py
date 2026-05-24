import urllib.request
import json

key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lb3llYWV5eXNhbmVsYW1ydXNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM4MTY5NCwiZXhwIjoyMDkyOTU3Njk0fQ.K559DXWnD5iPE8CwV1XsjVdhzT0jYnCrMl_RJGjZUDo"

for table in ["conversations", "messages"]:
    url = f"https://neoyeaeyysanelamruso.supabase.co/rest/v1/{table}?select=*&limit=1"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}"
        }
    )
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Table '{table}': EXISTS (Status {response.status})")
    except Exception as e:
        print(f"Table '{table}': FAILED ({e})")
