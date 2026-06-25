"""
Manuals management router for uploading, deleting, and listing motorcycle manuals.

Handles PDF processing with PyMuPDF, embedding generation via OpenAI,
structured data extraction using LLM, and storage in Supabase vector database.
Mounted at /admin prefix.
"""
import os
import json
import logging
import asyncio
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import fitz  # PyMuPDF
from openai import AsyncOpenAI

from config import OPENAI_API_KEY, LLM_MODEL, EMBEDDING_MODEL, VECTOR_TABLE
from vector_store.supabase_client import get_supabase

router = APIRouter()
logger = logging.getLogger(__name__)

# Directory where motorcycle images are stored in the frontend
FRONTEND_IMAGES_DIR = Path(__file__).resolve().parent.parent.parent / "web" / "public" / "images" / "motos"

async def generate_embedding_async(client: AsyncOpenAI, text: str) -> list[float]:
    """Generates an embedding vector for the given text using OpenAI's async client."""
    text = text.replace('\n', ' ')
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding

async def extract_structured_data(client: AsyncOpenAI, text: str) -> dict:
    """
    Extracts structured data from manual page text using LLM.

    Returns a JSON object with keys:
    - titulo: Page title/summary
    - descripcion: Brief content description
    - componentes: List of parts with descriptions and part numbers
    - procedimientos: List of steps/procedures/warnings
    """
    prompt = f"""
    Eres un asistente experto analizando manuales de motocicletas. Extrae la información del siguiente texto de una página en un objeto JSON estricto con las siguientes claves:
    - "titulo": Resumen o título de lo que trata la página (ej. "CALCOMANÍAS NEGRO NEBULOSA", "SISTEMA ELÉCTRICO").
    - "descripcion": Breve descripción del contenido.
    - "componentes": Lista de objetos JSON, cada uno con las claves "descripcion" (nombre de la pieza) y "parte_no" (número de parte o código de catálogo, si aparece; si no, null) y "cantidad" (si aparece). Si no hay, usa un arreglo vacío [].
    - "procedimientos": Lista de pasos, instrucciones o advertencias. Si no hay, usa null.

    Texto a analizar:
    {text}
    """
    try:
        response = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "Devuelve únicamente un objeto JSON válido."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        logger.error(f"Error extracting structured data: {e}")
        return {
            "titulo": "Información del Manual",
            "descripcion": text[:150] + "...",
            "componentes": [],
            "procedimientos": None
        }

async def process_page(page_num: int, page_text: str, name: str, image_url: str, openai_client: AsyncOpenAI, supabase):
    """
    Processes a single PDF page: extracts structured data, generates embedding,
    and inserts the chunk into Supabase.
    """
    if not page_text:
        page_text = f"Portada o página sin texto del manual {name}"

    structured_json = await extract_structured_data(openai_client, page_text)
    embedding = await generate_embedding_async(openai_client, page_text)

    datos_json = {"texto_plano": page_text}
    if page_num == 0 and image_url:
        datos_json["image_url"] = image_url

    payload = {
        "fuente": name,
        "pagina": page_num + 1,
        "texto": json.dumps(structured_json, ensure_ascii=False),
        "datos": datos_json,
        "embedding": embedding
    }

    supabase.table(VECTOR_TABLE).insert(payload).execute()
    return True

@router.post("/manuals")
async def upload_manual(
    name: str = Form(...),
    pdf: UploadFile = File(...),
    image: UploadFile = File(None)
):
    """
    Uploads a motorcycle manual PDF and processes it into the vector database.

    Steps:
    1. Saves the optional cover image to the frontend public directory
    2. Reads and parses the PDF using PyMuPDF
    3. Processes each page in batches (5 concurrent) for embedding + structured extraction
    4. Inserts all chunks into Supabase vector database
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="Falta OPENAI_API_KEY en el servidor")

    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    supabase = get_supabase()

    # 1. Save the image if provided
    image_url = None
    if image:
        if image.content_type != "image/png" and not (image.filename or "").lower().endswith(".png"):
            raise HTTPException(status_code=400, detail="La imagen debe estar en formato PNG")
        os.makedirs(FRONTEND_IMAGES_DIR, exist_ok=True)
        safe_filename = image.filename.replace(" ", "_")
        image_path = FRONTEND_IMAGES_DIR / safe_filename
        
        with open(image_path, "wb") as f:
            f.write(await image.read())
        
        image_url = f"/images/motos/{safe_filename}"

    # 2. Read and process the PDF
    try:
        pdf_content = await pdf.read()
        doc = fitz.open(stream=pdf_content, filetype="pdf")
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        raise HTTPException(status_code=400, detail="Error leyendo el archivo PDF")

    # 3. Process page by page in batches
    chunks_inserted = 0
    pages_to_process = []
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text").strip()
        pages_to_process.append((page_num, text))

    BATCH_SIZE = 5
    try:
        for i in range(0, len(pages_to_process), BATCH_SIZE):
            batch = pages_to_process[i:i + BATCH_SIZE]
            tasks = [
                process_page(p_num, p_text, name, image_url, openai_client, supabase)
                for p_num, p_text in batch
            ]
            await asyncio.gather(*tasks)
            chunks_inserted += len(batch)

    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando el PDF y creando embeddings: {str(e)}")

    return {
        "message": "Manual subido exitosamente",
        "name": name,
        "image": image_url,
        "chunks": chunks_inserted
    }

@router.delete("/manuals/{name}")
async def delete_manual(name: str):
    """Deletes a manual and all its chunks from Supabase."""
    supabase = get_supabase()
    try:
        response = supabase.table(VECTOR_TABLE).delete().eq("fuente", name).execute()
        deleted_count = len(response.data or [])
        return {"message": f"Manual '{name}' eliminado", "deleted_chunks": deleted_count}
    except Exception as e:
        logger.error(f"Error deleting manual: {e}")
        raise HTTPException(status_code=500, detail=f"Error eliminando manual: {str(e)}")

@router.get("/manuals")
async def get_manuals_catalog():
    """
    Returns the catalog of all distinct manuals stored in Supabase.

    Fetches the first page of each manual to retrieve the cover image URL.
    """
    supabase = get_supabase()
    
    # Fetch first page of each manual to get image_url from "datos"
    # Since we can't easily do SELECT DISTINCT via Supabase REST without RPC,
    # we fetch all and group in memory (filtering by page = 1)
    try:
        response = supabase.table(VECTOR_TABLE).select("fuente, datos").eq("pagina", 1).execute()
        manuals = response.data or []
        
        catalog = []
        for m in manuals:
            name = m.get("fuente")
            datos = m.get("datos", {})
            if isinstance(datos, str):
                try:
                    datos = json.loads(datos)
                except:
                    datos = {}
            image = datos.get("image_url", None)
            
            # Avoid duplicates if multiple page-1 entries exist due to errors
            if not any(cat["name"] == name for cat in catalog):
                catalog.append({
                    "id": f"DB-{name}",
                    "name": name,
                    "image": image,
                    "status": "Ready",
                    "specs": { "displacement": "Info del Manual", "mileage": "-" }
                })
        
        return catalog
    except Exception as e:
        logger.error(f"Error fetching manuals catalog: {e}")
        return []
