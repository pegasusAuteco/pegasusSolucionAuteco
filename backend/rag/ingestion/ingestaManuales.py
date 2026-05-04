import os
import base64
import io
import json
from dotenv import load_dotenv
from pdf2image import convert_from_path
from openai import OpenAI

load_dotenv()
cliente = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def imagen_a_base64(pagina: int, rutaPDF: str) -> str:
    paginas = convert_from_path(rutaPDF, dpi=100, first_page=pagina, last_page=pagina)
    memoria = io.BytesIO()
    paginas[0].save(memoria, format="JPEG")
    return base64.b64encode(memoria.getvalue()).decode("utf-8")


def extraer_datos_ia(imagen_base64: str, prompt: str) -> dict:
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


def generar_embedding(texto: str) -> list[float]:
    respuesta = cliente.embeddings.create(model="text-embedding-3-small", input=texto)
    return respuesta.data[0].embedding


def guardar_en_vectordb(chunk: dict, embedding: list[float]):
    # Adapta esto a tu motor: Supabase/pgvector, ChromaDB, Pinecone, Qdrant, etc.
    print(f"[stub] Página {chunk['metadata']['pagina']} lista — embedding dim: {len(embedding)}")


PROMPT = """
Analiza la imagen y responde SOLO con un JSON con estas claves:
- "titulo": sección o título de la página
- "descripcion": resumen técnico
- "componentes": lista de piezas o componentes
- "procedimientos": lista de pasos descritos
Si alguna clave no aplica, usa null.
"""

def procesar_pdf_completo(rutaPDF: str):
    from pdf2image import pdfinfo_from_path
    total = pdfinfo_from_path(rutaPDF)["Pages"]
    print(f"Procesando {total} páginas: {rutaPDF}")

    for pagina in range(1, total + 1):
        b64 = imagen_a_base64(pagina, rutaPDF)
        datos = extraer_datos_ia(b64, PROMPT)
        texto = datos.get("texto_plano") or json.dumps(datos, ensure_ascii=False)
        chunk = {"texto": texto, "metadata": {"fuente": os.path.basename(rutaPDF), "pagina": pagina, "datos": datos}}
        embedding = generar_embedding(chunk["texto"])
        guardar_en_vectordb(chunk, embedding)

    print("✅ Listo.")


if __name__ == "__main__":
    PDF_PATH = "ruta/a/tu/manual.pdf"
    procesar_pdf_completo(PDF_PATH)
