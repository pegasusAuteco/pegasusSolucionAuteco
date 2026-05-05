# 📄 Pegasus Mechanics — Ingesta de Manuales PDF

Script de Node.js que procesa los manuales técnicos de motos en PDF, extrae su contenido página a página, genera embeddings con OpenAI y los almacena vectorizados en Supabase.

---

## ⚙️ Tecnologías

| Librería | Función |
|---|---|
| `pdf-parse` | Leer PDFs y extraer texto por página |
| `openai` | Embeddings (`text-embedding-ada-002`) + extracción de repuestos (`gpt-4o-mini`) |
| `@supabase/supabase-js` | Insertar registros en la tabla `paginas_manuales` |
| `dotenv` | Leer las claves del `.env` en la raíz del proyecto |

---

## 🗄️ Esquema de Supabase requerido

Asegúrate de tener creada la siguiente tabla y la extensión `pgvector` en tu proyecto de Supabase:

```sql
-- Habilitar extensión de vectores
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla principal de páginas de manuales
CREATE TABLE paginas_manuales (
    id BIGSERIAL PRIMARY KEY,
    sistema_moto TEXT,
    numero_pagina INTEGER,
    repuestos JSONB,
    embedding VECTOR(1536)
);

-- Índice para búsqueda semántica eficiente
CREATE INDEX ON paginas_manuales USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

## 🚀 Instalación

```bash
cd ingestion
npm install
```

---

## 🔑 Variables de entorno

El script lee el archivo `.env` de la raíz del proyecto (`../`). Asegúrate de que contenga:

```env
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 📋 Uso

### 1. Verificar conexiones primero

```bash
npm test
```

Esto valida que Supabase y OpenAI respondan correctamente antes de gastar tokens.

### 2. Procesar un manual específico

```bash
node ingest.js --file="../motos/BENELLI-180S-CBS.pdf" --modelo="Benelli 180S"
```

### 3. Procesar TODOS los manuales disponibles

```bash
node ingest.js --all
```

> ⚠️ El proceso completo puede tardar varios minutos por archivo (según el número de páginas). Cada página genera una llamada a OpenAI.

---

## 🏍️ Manuales disponibles (mapeados automáticamente con `--all`)

| Archivo PDF | Modelo |
|---|---|
| `BENELLI-180S-CBS.pdf` | Benelli 180S |
| `BENELLI-IMPERIALE-400.pdf` | Benelli Imperiale 400 |
| `CATALOGO-ADVANCE-R-110.pdf` | Advance R 110 |
| `CATALOGO-AGILITY-125-.pdf` | Agility 125 |
| `CATALOGO-AGILITY-GO-7-11-25.pdf` | Agility Go |
| `CATALOGO-ZONTES-368G.pdf` | Zontes 368G |
| `MRX-150-CAMO-PRO-CAMO-CBS.pdf` | MRX 150 |
| `MRX-ARIZONA-ABS.pdf` | MRX Arizona |
| `NINJA-400.pdf` | Ninja 400 |
| `TVS RAIDER-125.pdf` | TVS Raider 125 |
| `TVS SPORT 100.pdf` | TVS Sport 100 |
| `TVS-APACHE 200RR-FI.pdf` | TVS Apache 200RR |

---

## 📦 Qué se guarda por página

```json
{
  "sistema_moto": "Benelli 180S — Motor",
  "numero_pagina": 12,
  "repuestos": {
    "sistema": "Motor",
    "repuestos": [
      { "nombre": "Pistón", "codigo": "BN180-P01", "cantidad": 1 },
      { "nombre": "Anillos de pistón", "codigo": null, "cantidad": 2 }
    ]
  },
  "embedding": [0.0012, -0.0234, ...] // 1536 dimensiones
}
```

---

## 🔍 Búsqueda semántica en Supabase

Una vez ingestados los manuales, puedes hacer búsquedas con la función RPC de Supabase:

```sql
-- Crear función de búsqueda por similitud coseno
CREATE OR REPLACE FUNCTION buscar_manuales(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.75,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  sistema_moto TEXT,
  numero_pagina INT,
  repuestos JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    sistema_moto,
    numero_pagina,
    repuestos,
    1 - (embedding <=> query_embedding) AS similarity
  FROM paginas_manuales
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```
