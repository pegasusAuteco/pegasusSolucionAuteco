# Herramientas de fábrica de Python
import os      # Para leer archivos y variables del sistema
import base64  # Para traducir imágenes a texto
import io      # Para guardar la imagen temporalmente en la memoria
import json    # Para manejar los datos estructurados que nos dará la IA

# Herramientas que instalamos
from dotenv import load_dotenv
from pdf2image import convert_from_path
from openai import OpenAI

# 1. Cargamos el archivo .env donde guardaste tu llave secreta
load_dotenv()

# 2. Inicializamos la conexión con OpenAI usando esa llave
cliente = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))



def imagen_base64(pagina,rutaPDF):
    paginasProcesadas = convert_from_path(rutaPDF, dpi = 100, first_page = pagina  , last_page = pagina )
    imagen_sola = paginasProcesadas[0]

    memoria = io.BytesIO()
    imagen_sola.save(memoria,format = "JPEG")
    texto_base64 = base64.b64encode(memoria.getvalue()).decode('utf-8')
    return texto_base64
