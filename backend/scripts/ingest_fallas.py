import os
import sys
import json
import logging
from pathlib import Path

# Agregar el directorio backend al path para importar config y supabase_client
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from config import OPENAI_API_KEY, EMBEDDING_MODEL
from vector_store.supabase_client import get_supabase
from openai import OpenAI

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

FALLAS_TABLE = 'fallas_diagnostico'

def generate_embedding(client: OpenAI, text: str) -> list[float]:
    text = text.replace('\n', ' ')
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding

def main():
    if not OPENAI_API_KEY:
        logging.error("Falta OPENAI_API_KEY en las variables de entorno.")
        sys.exit(1)

    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    supabase = get_supabase()

    json_path = backend_dir.parent / "knowledge_base" / "fallas_comunes.json"
    
    if not json_path.exists():
        logging.error(f"Archivo no encontrado: {json_path}")
        sys.exit(1)

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    logging.info(f"🚀 Iniciando ingesta en tabla: {FALLAS_TABLE}...")

    for item in data:
        modelo = item.get("modelo")
        fallas = item.get("fallas", [])
        logging.info(f"\n🏍️ Modelo: {modelo}")

        for falla in fallas:
            sintoma = falla.get("sintoma", "")
            componente = falla.get("componente", "")
            causa = falla.get("causa", "")
            solucion = falla.get("solucion", "")
            pasos_revision = falla.get("pasos_revision", [])

            # Texto enriquecido para el embedding
            search_content = f"Modelo: {modelo}. Síntoma: {sintoma}. Componente: {componente}."
            logging.info(f"   - Generando embedding para: {componente}...")
            
            embedding = generate_embedding(openai_client, search_content)

            payload = {
                "modelo": modelo,
                "componente": componente,
                "sintoma": sintoma,
                "causa": causa,
                "solucion": solucion,
                "pasos_revision": pasos_revision,
                "embedding": embedding
            }

            try:
                response = supabase.table(FALLAS_TABLE).insert(payload).execute()
                logging.info(f"   ✅ Falla e instrucciones de revisión insertadas.")
            except Exception as e:
                logging.error(f"   ❌ Error insertando falla: {e}")

    logging.info("\n✨ Ingesta completada con éxito.")

if __name__ == "__main__":
    main()
