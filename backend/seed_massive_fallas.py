import asyncio
from openai import AsyncOpenAI
from config import OPENAI_API_KEY, EMBEDDING_MODEL
from vector_store.supabase_client import get_supabase

async def seed_massive_fallas():
    if not OPENAI_API_KEY:
        print("Falta OPENAI_API_KEY")
        return

    openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    supabase = get_supabase()

    # Modelos identificados en la base de datos
    modelos = [
        'Advance R 110', 'TVS Sport 100', 'Benelli Imperiale 400', 'Agility GO',
        'TVS Apache 200', 'Zontes 368G', 'TVS Raider 125', 'Ducati Panigale V4',
        'Benelli 180S', 'Agility 125', 'Ninja 400', 'MRX Arizona', 'MRX 150'
    ]

    fallas_base = [
        # MOTOR
        {
            "componente": "Motor / Biela (Motor desvielado / Golpe fuerte interno)",
            "causa": "Falta de lubricación, nivel bajo de aceite, degradación del aceite, o sobrecalentamiento extremo. Conducción sostenida en la línea roja de RPM.",
            "solucion": "Desarmar motor por completo. Extraer el conjunto cigüeñal y biela. Inspeccionar daños. Reemplazar biela, cigüeñal, balineras (rodamientos) y revisar cilindro/pistón."
        },
        {
            "componente": "Motor / Culata (Sonido de golpeteo / cascabeleo en parte superior)",
            "causa": "Válvulas descalibradas (exceso de luz libre), desgaste en balancines, eje de levas rayado, o desgaste en las guías de válvulas.",
            "solucion": "Realizar calibración de válvulas con galgas según manual. Si el ruido persiste, cambiar balancines y eje de levas."
        },
        {
            "componente": "Motor / Pistón y Cilindro (Consumo excesivo de aceite y humo azul)",
            "causa": "Anillos del pistón desgastados, rayones en la camisa del cilindro por ingreso de polvo, o sellos de válvulas cristalizados.",
            "solucion": "Realizar prueba de compresión. Reemplazar sellos de válvulas. Si la compresión es baja, hacer cambio de kit de cilindro (pistón, anillos, bulón, empaques)."
        },
        {
            "componente": "Motor / Cadena de Distribución (Ruido de roce metálico o campaneo)",
            "causa": "Tensor de la cadenilla fallando o cadenilla elongada (estirada) más allá de su límite de servicio.",
            "solucion": "Revisar tensión. Cambiar tensor automático. Si no corrige, cambiar cadenilla de distribución y guías plásticas."
        },
        {
            "componente": "Motor / Empaques (Fuga de aceite visible en el motor)",
            "causa": "Empaque de culata o cilindro roto, o-rings desgastados, exceso de presión en el cárter (manguera de desfogue obstruida).",
            "solucion": "Limpiar y ubicar la fuga exacta. Reemplazar los empaques afectados usando el torque específico de fábrica. Revisar desfogue del motor."
        },
        
        # SISTEMA DE COMBUSTIBLE / INYECCIÓN
        {
            "componente": "Combustible / Inyección Electrónica (Ahogos al acelerar o pérdida de potencia)",
            "causa": "Inyector sucio, bomba de gasolina con baja presión, o filtro de combustible obstruido.",
            "solucion": "Medir presión de la bomba de combustible. Lavar inyector por ultrasonido. Reemplazar filtro de gasolina. Si la presión es baja, cambiar el motor de la bomba."
        },
        {
            "componente": "Combustible / Carburador (Moto se apaga en mínima o consumo excesivo)",
            "causa": "Chicleres de alta/baja tapados, flotador mal calibrado, o entrada de aire pirata por el múltiple de admisión.",
            "solucion": "Limpiar carburador con líquido especial, sopletear chicleres. Ajustar tornillo de mezcla y ralentí. Revisar que la tobera de goma no esté agrietada."
        },

        # EMBRAGUE Y TRANSMISIÓN
        {
            "componente": "Transmisión / Embrague (Motor se revoluciona pero no avanza / Patina)",
            "causa": "Discos de embrague quemados, resortes cedidos o uso de aceite inadecuado (automotriz sin norma JASO MA2).",
            "solucion": "Drenar aceite, desmontar tapa cluster. Reemplazar paquete completo de discos de fricción, discos separadores y resortes. Usar aceite correcto."
        },
        {
            "componente": "Transmisión / Cambios (Marchas duras al entrar o se saltan los cambios)",
            "causa": "Guaya de embrague destemplada, eje de cambios o selector desgastado, o piñones de la caja con las garras redondeadas.",
            "solucion": "Primero calibrar tensión de la guaya de embrague. Si el problema persiste, abrir motor para inspeccionar el selector (estrella) y horquillas de la caja de cambios."
        },
        {
            "componente": "Transmisión / Kit de Arrastre (Golpeteo en la rueda trasera o tirones al acelerar)",
            "causa": "Cadena de tracción floja, eslabones pegados, o dientes de los piñones (sprocket) desgastados/afilados.",
            "solucion": "Tensionar y lubricar cadena. Si los dientes del piñón están filosos o la cadena tiene mucha elongación, reemplazar el kit de arrastre completo."
        },

        # SISTEMA ELÉCTRICO Y ENCENDIDO
        {
            "componente": "Eléctrico / Batería (La moto no da arranque, tablero se apaga o parpadea)",
            "causa": "Batería descargada/dañada, estator quemado (no genera corriente) o regulador/rectificador averiado.",
            "solucion": "Medir voltaje de batería en reposo (>12.4V). Encender y medir carga (13.5V a 14.5V). Si no sube el voltaje, probar continuidad y resistencia en estator. Cambiar pieza defectuosa."
        },
        {
            "componente": "Eléctrico / Bujía (Explosiones en el escape, tirones, dificultad para encender)",
            "causa": "Bujía carbonizada, capuchón de bujía dañado (fuga de chispa), o bobina de alta deficiente.",
            "solucion": "Revisar luz (gap) de la bujía y limpiar. Si el electrodo está gastado, reemplazar. Medir resistencia de bobina de alta y capuchón."
        },
        {
            "componente": "Eléctrico / Motor de Arranque (Al presionar start solo hace un 'clic')",
            "causa": "Relé de arranque (chanchita) dañado, carbones (escobillas) del motor de arranque gastados, o batería con bajo amperaje de arranque.",
            "solucion": "Puentes relé para descartar. Si gira, cambiar relé. Si no gira, bajar motor de arranque, limpiar colector e instalar kit de carbones nuevos."
        },

        # FRENOS Y DIRECCIÓN
        {
            "componente": "Frenos / Pastillas y Disco (Frenado largo, esponjoso o sonido de roce metálico)",
            "causa": "Pastillas desgastadas (metal con metal), líquido de frenos degradado o con aire, disco alabeado/torcido.",
            "solucion": "Purgar el sistema hidráulico con líquido DOT 3/4 nuevo. Cambiar pastillas si tienen < 2mm de vida. Si hay pulsaciones al frenar, cambiar disco de freno."
        },
        {
            "componente": "Dirección / Rodamientos (Timón duro al girar, o golpeteo al frenar con la llanta delantera)",
            "causa": "Cunas de dirección (rodamientos) flojas, secas o con desgaste irregular por golpes.",
            "solucion": "Desarmar espiga de dirección, engrasar con litio. Si las cunas están marcadas, reemplazar rodamientos de dirección superior e inferior y ajustar tuerca castillo al torque correcto."
        },
        {
            "componente": "Suspensión / Barras (Fuga de aceite en barras delanteras o suspensión muy blanda)",
            "causa": "Retenes de suspensión reventados por polvo/golpes, o degradación del aceite hidráulico interno.",
            "solucion": "Desarmar barras telescópicas. Limpiar internamente, instalar retenes y guardapolvos nuevos, y rellenar con aceite hidráulico de suspensión en la medida exacta del manual."
        },

        # REFRIGERACIÓN
        {
            "componente": "Refrigeración (Sobrecalentamiento excesivo o testigo de temperatura encendido)",
            "causa": "Bajo nivel de líquido refrigerante, termo-ventilador dañado, o termostato pegado en posición cerrada.",
            "solucion": "Revisar nivel en radiador y tarro de reserva. Purgar aire del sistema. Probar encendido del ventilador puenteando el termoswitch. Cambiar refrigerante por uno de alta ebullición."
        }
    ]

    count = 0
    print("Iniciando inyección masiva de fallas...")

    for modelo in modelos:
        print(f"\\nProcesando modelo: {modelo}...")
        
        # Agrupar inserciones en lotes para no saturar OpenAI si son muchos
        for falla in fallas_base:
            falla_copy = falla.copy()
            falla_copy["modelo"] = modelo
            
            # Texto descriptivo para vectorizar
            texto_busqueda = f"{modelo} {falla_copy['componente']} {falla_copy['causa']} sintoma problema error falla"
            
            try:
                res = await openai_client.embeddings.create(
                    model=EMBEDDING_MODEL,
                    input=texto_busqueda
                )
                falla_copy["embedding"] = res.data[0].embedding
                
                # Inserción asíncrona pero manejada de a una para evitar problemas con la sesión de Supabase
                supabase.table("fallas_diagnostico").insert(falla_copy).execute()
                count += 1
            except Exception as e:
                print(f"❌ Error inyectando {falla_copy['componente']} en {modelo}: {e}")

    print(f"\\n✅ ¡Proceso completado! Se inyectaron {count} nuevas fallas en la base vectorial.")

if __name__ == '__main__':
    asyncio.run(seed_massive_fallas())
