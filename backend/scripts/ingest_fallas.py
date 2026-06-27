"""
Fault database ingestion script.

Reads the fallas_comunes.json knowledge base file and ingests
fault records into the Supabase fallas_diagnostico table with
generated embeddings for vector search.

Usage:
    python scripts/ingest_fallas.py
"""
import os
import sys
import json
import logging
from pathlib import Path

# Add the backend directory to path for importing config and supabase_client
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from config import OPENAI_API_KEY, EMBEDDING_MODEL
from vector_store.supabase_client import get_supabase
from openai import OpenAI

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

FALLAS_TABLE = 'fallas_diagnostico'

def generate_embedding(client: OpenAI, text: str) -> list[float]:
    """Generates an embedding vector for the given text using OpenAI's API."""
    text = text.replace('\n', ' ')
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )
    return response.data[0].embedding

def main():
    """
    Main ingestion function.

    Reads fallas_comunes.json, generates embeddings for each fault record,
    and inserts them into the Supabase fallas_diagnostico table.
    """
    if not OPENAI_API_KEY:
        logging.error("OPENAI_API_KEY missing from environment variables.")
        sys.exit(1)

    openai_client = OpenAI(api_key=OPENAI_API_KEY)
    supabase = get_supabase()

    json_path = backend_dir.parent / "knowledge_base" / "fallas_comunes.json"
    
    if not json_path.exists():
        logging.error(f"File not found: {json_path}")
        sys.exit(1)

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    logging.info(f"Starting ingestion into table: {FALLAS_TABLE}...")

    for item in data:
        modelo = item.get("modelo")
        fallas = item.get("fallas", [])
        logging.info(f"\nModel: {modelo}")

        for falla in fallas:
            sintoma = falla.get("sintoma", "")
            componente = falla.get("componente", "")
            causa = falla.get("causa", "")
            solucion = falla.get("solucion", "")
            pasos_revision = falla.get("pasos_revision", [])

            # Enriched text for embedding generation
            search_content = f"Modelo: {modelo}. Síntoma: {sintoma}. Componente: {componente}."
            logging.info(f"   - Generating embedding for: {componente}...")
            
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
                logging.info(f"   Fault and review instructions inserted successfully.")
            except Exception as e:
                logging.error(f"   Error inserting fault: {e}")

    logging.info("\nIngestion completed successfully.")

if __name__ == "__main__":
    main()
