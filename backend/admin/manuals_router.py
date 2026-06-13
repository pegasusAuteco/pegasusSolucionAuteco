import os
import json
import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import fitz  # PyMuPDF
from openai import OpenAI

from config import OPENAI_API_KEY, EMBEDDING_MODEL, VECTOR_TABLE
from vector_store.supabase_client import get_supabase

router = APIRouter()
logger = logging.getLogger(__name__)

# Directorio donde se guardan las imágenes en el frontend
FRONTEND_IMAGES_DIR = Path(__file__).resolve().parent.parent.parent / "web" / "public" / "images" / "motos"

def generate_embedding(client: OpenAI, text: str) -> list[float]:
    text = text.replace('\n', ' ')
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding

@router.post("/manuals")
async def upload_manual(
    name: str = Form(...),
    pdf: UploadFile = File(...),
    image: UploadFile = File(None)
):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="Falta OPENAI_API_KEY en el servidor")

    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    supabase = get_supabase()

    # 1. Guardar la imagen si fue proporcionada
    image_url = None
    if image:
        os.makedirs(FRONTEND_IMAGES_DIR, exist_ok=True)
        # Limpiar el nombre del archivo para evitar espacios raros
        safe_filename = image.filename.replace(" ", "_")
        image_path = FRONTEND_IMAGES_DIR / safe_filename
        
        with open(image_path, "wb") as f:
            f.write(await image.read())
        
        image_url = f"/images/motos/{safe_filename}"

    # 2. Leer y procesar el PDF
    try:
        pdf_content = await pdf.read()
        doc = fitz.open(stream=pdf_content, filetype="pdf")
    except Exception as e:
        logger.error(f"Error leyendo el PDF: {e}")
        raise HTTPException(status_code=400, detail="Error leyendo el archivo PDF")

    # 3. Procesar página por página
    chunks_inserted = 0
    try:
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text").strip()
            
            if not text:
                text = f"Portada o página sin texto del manual {name}"

            # Generar embedding
            embedding = generate_embedding(openai_client, text)

            # Preparar payload para manuales_chunks
            # En la primera página guardamos el image_url en el json de datos para que el inventario pueda leerlo
            datos_json = {"texto_plano": text}
            if page_num == 0 and image_url:
                datos_json["image_url"] = image_url

            payload = {
                "fuente": name,
                "pagina": page_num + 1,
                "texto": json.dumps({"titulo": f"Manual {name}", "descripcion": f"Página {page_num + 1} de {name}"}),
                "datos": datos_json,
                "embedding": embedding
            }

            # Insertar en Supabase
            supabase.table(VECTOR_TABLE).insert(payload).execute()
            chunks_inserted += 1

    except Exception as e:
        logger.error(f"Error procesando el PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando el PDF y creando embeddings: {str(e)}")

    return {
        "message": "Manual subido exitosamente",
        "name": name,
        "image": image_url,
        "chunks": chunks_inserted
    }

@router.get("/manuals")
async def get_manuals_catalog():
    """Obtiene los manuales distintos almacenados en Supabase (para el inventario)."""
    supabase = get_supabase()
    
    # Obtenemos la primera página de cada manual para recuperar el image_url de "datos"
    # Dado que no podemos hacer SELECT DISTINCT ON en el REST de Supabase fácilmente sin RPC,
    # simplemente traemos todos y agrupamos en memoria (o filtramos por página = 1)
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
            
            # Evitar duplicados si hay varios con pagina 1 por error
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
        logger.error(f"Error obteniendo catálogo de manuales: {e}")
        return []
