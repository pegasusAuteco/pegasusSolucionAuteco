"""
PDF manual ingestion script.

Processes motorcycle technical manuals (PDFs), extracts content via GPT-4o-mini
vision, generates embeddings, and stores chunks in Supabase pgvector for
chatbot retrieval.
"""
import os
import base64
import io
import json
import glob
from pathlib import Path
from dotenv import load_dotenv
import httpx
import fitz  # PyMuPDF
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

cliente = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    print("WARNING: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")


def imagen_a_base64(pagina: int, rutaPDF: str) -> str:
    """Render a PDF page to a base64-encoded JPEG string."""
    doc = fitz.open(rutaPDF)
    page = doc.load_page(pagina - 1)
    pix = page.get_pixmap(dpi=100)
    imagen_bytes = pix.tobytes("jpeg")
    return base64.b64encode(imagen_bytes).decode("utf-8")


def extraer_datos_ia(imagen_base64: str, prompt: str) -> dict:
    """Send an image to GPT-4o-mini and return the parsed JSON response with retry on rate limits."""
    import time
    intentos = 0
    while intentos < 6:
        try:
            respuesta = cliente.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{imagen_base64}"}}
                        ]
                    }
                ],
                max_tokens=1000
            )
            contenido = respuesta.choices[0].message.content
            try:
                return json.loads(contenido)
            except json.JSONDecodeError:
                return {"texto_plano": contenido}
        except Exception as e:
            if "429" in str(e) or "rate_limit" in str(e).lower():
                espera = (intentos + 1) * 15
                print(f"  OpenAI Rate Limit. Waiting {espera} sec...")
                time.sleep(espera)
                intentos += 1
            else:
                raise e
    raise Exception("Max OpenAI rate limit retries exceeded.")


def generar_embedding(texto: str) -> list[float]:
    """Generate a text embedding using OpenAI's text-embedding-3-small model with retry on rate limits."""
    import time
    intentos = 0
    while intentos < 6:
        try:
            respuesta = cliente.embeddings.create(model="text-embedding-3-small", input=texto)
            return respuesta.data[0].embedding
        except Exception as e:
            if "429" in str(e) or "rate_limit" in str(e).lower():
                espera = (intentos + 1) * 10
                time.sleep(espera)
                intentos += 1
            else:
                raise e
    raise Exception("Max embedding retries exceeded.")


def guardar_en_vectordb(chunk: dict, embedding: list[float]):
    """Store a text chunk with its embedding vector in Supabase pgvector."""
    if not supabase_url or not supabase_key:
        print(f"[stub] Page {chunk['metadata']['pagina']} ready — embedding dim: {len(embedding)}")
        return

    try:
        data = {
            "texto": chunk["texto"],
            "fuente": chunk["metadata"]["fuente"],
            "pagina": chunk["metadata"]["pagina"],
            "datos": chunk["metadata"]["datos"],
            "embedding": embedding
        }
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
        endpoint = f"{supabase_url}/rest/v1/manuales_chunks"
        with httpx.Client() as client:
            res = client.post(endpoint, headers=headers, json=data)
            res.raise_for_status()
        print(f"Page {chunk['metadata']['pagina']} saved to Supabase.")
    except Exception as e:
        print(f"Error saving page {chunk['metadata']['pagina']}: {e}")


PROMPT = """
Analiza la imagen y responde SOLO con un JSON con estas claves:
- "titulo": sección o título de la página
- "descripcion": resumen técnico
- "componentes": lista de piezas o componentes
- "procedimientos": lista de pasos descritos
Si alguna clave no aplica, usa null.
"""


def procesar_pdf_completo(rutaPDF: str):
    """Process all pages of a PDF: extract content via AI, embed, and store in vector DB."""
    doc = fitz.open(rutaPDF)
    total = len(doc)
    print(f"Processing {total} pages: {rutaPDF}")
    for pagina in range(1, total + 1):
        b64 = imagen_a_base64(pagina, rutaPDF)
        datos = extraer_datos_ia(b64, PROMPT)
        texto = datos.get("texto_plano") or json.dumps(datos, ensure_ascii=False)
        chunk = {"texto": texto, "metadata": {"fuente": os.path.basename(rutaPDF), "pagina": pagina, "datos": datos}}
        embedding = generar_embedding(chunk["texto"])
        guardar_en_vectordb(chunk, embedding)
    print("Done.")


def procesar_carpeta(carpeta_path: str):
    """Find all PDFs in a folder and process each one."""
    pdfs = glob.glob(os.path.join(carpeta_path, "*.pdf"))
    if not pdfs:
        print(f"No PDFs found in: {carpeta_path}")
        return
    print(f"Found {len(pdfs)} manuals. Starting ingestion...\n")
    for pdf in pdfs:
        print(f"\n--- Processing: {os.path.basename(pdf)} ---")
        try:
            procesar_pdf_completo(pdf)
        except Exception as e:
            print(f"Error processing {os.path.basename(pdf)}: {e}")


if __name__ == "__main__":
    CARPETA_MOTOS = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../motos"))
    procesar_carpeta(CARPETA_MOTOS)
