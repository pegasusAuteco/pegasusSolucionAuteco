import asyncio
from openai import AsyncOpenAI
from config import OPENAI_API_KEY, EMBEDDING_MODEL
from vector_store.supabase_client import get_supabase

async def seed_fallas():
    if not OPENAI_API_KEY:
        print("Falta OPENAI_API_KEY")
        return

    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    supabase = get_supabase()

    nuevas_fallas = [
        {
            "modelo": "TVS Raider 125",
            "componente": "Motor / Biela (Motor desvielado)",
            "causa": "Falta de lubricación, nivel críticamente bajo de aceite, o sobrecalentamiento extremo prolongado.",
            "solucion": "Desarmar motor completo (carcasas centrales). Reemplazar conjunto de cigüeñal y biela, cambiar rodamientos internos, verificar estado de la bomba de aceite, y reemplazar cilindro/pistón si sufrieron daños por fricción."
        },
        {
            "modelo": "TVS Raider 125",
            "componente": "Culata / Válvulas (Sonido extraño, golpeteo)",
            "causa": "Holgura de válvulas descalibrada, excesiva luz de válvulas, o desgaste prematuro en balancines y eje de levas.",
            "solucion": "Realizar calibración de válvulas según la tolerancia especificada en el manual técnico. Si el sonido persiste tras calibrar, inspeccionar y cambiar balancines o eje de levas."
        },
        {
            "modelo": "TVS Raider 125",
            "componente": "Motor / Cilindro (Cascabeleo o sonido metálico fuerte)",
            "causa": "Uso de combustible de bajo octanaje, exceso de carbonilla en la cámara de combustión, o desgaste excesivo/juego entre pistón y cilindro.",
            "solucion": "Descarbonar cámara de combustión y válvulas. Si hay desgaste físico comprobado (cabeceo del pistón), cambiar el kit completo de cilindro, anillos y pistón."
        },
        {
            "modelo": "TVS Raider 125",
            "componente": "Motor / Cadena de Distribución (Ruido de roce metálico)",
            "causa": "Tensor de cadenilla dañado que no ajusta correctamente, o cadenilla de distribución estirada por el kilometraje.",
            "solucion": "Reemplazar inicialmente el tensor automático de la cadenilla. Si el problema no se soluciona, bajar culata/volante y reemplazar cadenilla de distribución completa con sus guías."
        },
        {
            "modelo": "TVS Raider 125",
            "componente": "Embrague (Motor suena revolucionado pero no avanza con fuerza)",
            "causa": "Discos de embrague (clutch) quemados o cristalizados por mal hábito de manejo o por usar un tipo de aceite incorrecto sin aditivo JASO MA2.",
            "solucion": "Drenar aceite, abrir tapa cluster y reemplazar paquete de discos de fricción y separadores metálicos. Revisar tolerancia de resortes de prensa."
        }
    ]

    for falla in nuevas_fallas:
        # Texto para hacer el embedding (lo que buscará el usuario)
        texto_busqueda = f"{falla['modelo']} {falla['componente']} {falla['causa']} motor desvielado sonido extraño"
        
        # Generar embedding
        try:
            res = await openai_client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=texto_busqueda
            )
            embedding = res.data[0].embedding
            
            falla["embedding"] = embedding
            
            # Insertar en supabase
            supabase.table("fallas_diagnostico").insert(falla).execute()
            print(f"✅ Insertada falla: {falla['componente']}")
        except Exception as e:
            print(f"❌ Error insertando {falla['componente']}: {e}")

if __name__ == '__main__':
    asyncio.run(seed_fallas())
