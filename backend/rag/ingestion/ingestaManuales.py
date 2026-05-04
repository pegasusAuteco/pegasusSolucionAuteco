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


def extraer_datos_ia(imagen_base64,prompt):
    envio_dato = cliente.chat.completions.create(
        model = gpt-4o-mini,
        messages =[{
            role = user,
            content =[{
                type =text,
                text = prompt  
            },
            {
             type = image_url,
             image_url={
                url = f"data:image/jpeg;base64,{imagen_base64}"
                    }   
                }
            ]
        }
    ],
    max_tokens = 1000 
)
    return envio_dato
