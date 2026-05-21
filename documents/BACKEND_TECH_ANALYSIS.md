# Análisis Tecnológico del Backend — MotorConnect / Pegasus

## Stack actual

| Tecnología | Propósito | ¿En uso? |
|---|---|---|
| **FastAPI + Uvicorn** | Framework web y servidor ASGI | ✅ Activo |
| **SQLAlchemy + asyncpg** | ORM async → PostgreSQL (tabla `usuarios`) | ✅ Activo |
| **Pydantic + pydantic-settings** | Validación de datos y configuración por env vars | ✅ Activo |
| **python-jose + passlib + bcrypt** | JWT (24h) y hashing de contraseñas | ✅ Activo |
| **openai** | Embeddings (`text-embedding-3-small`) + LLM (`gpt-4o-mini`) | ✅ Activo |
| **supabase** | Cliente del vector store RAG (pgvector) | ✅ Activo |
| **redis[asyncio]** | Caché caliente de sesiones activas (TTL 24h) | ✅ Activo |
| **motor** | Cliente async de MongoDB (logs fríos de conversaciones) | ✅ Activo |
| **python-dotenv + httpx** | Carga de `.env` y cliente HTTP async | ✅ Activo |
| **python-multipart** | Subida de archivos en endpoints | ✅ Activo |
| **qdrant-client** | Cliente de Qdrant (vector store alternativo) | ❌ Sin uso |
| **groq** | Cliente de Groq API (LLM alternativo) | ❌ Sin uso |
| **alembic** | Migraciones de base de datos | ❌ Sin uso |

## Almacenamiento de datos

El proyecto usa 4 sistemas de almacenamiento distintos:

### PostgreSQL (puerto 5433)
- Contenedor Docker: `motorconnect-db`
- Gestiona: usuarios y autenticación
- Tabla creada automáticamente por SQLAlchemy al arrancar (`Base.metadata.create_all`):

| Tabla | Columnas |
|---|---|
| `usuarios` | `id`, `nombre`, `email`, `password_hash`, `accept_terms`, `rol` (employee/admin), `empresa_taller`, `created_at`, `updated_at` |

### Supabase — pgvector (externo)
- Gestiona: conocimiento técnico del RAG
- Acceso vía RPCs: `match_manuales_chunks()` y `match_fallas_diagnostico()`

| Tabla | Contenido |
|---|---|
| `manuales_chunks` | Chunks de PDFs técnicos de motos (vector 1536d) |
| `fallas_diagnostico` | Fallas con síntoma, causa, solución y pasos de revisión |

### Redis (puerto 6379)
- Contenedor Docker: `motorconnect-redis`
- Gestiona: sesiones activas de conversación
- Clave: `session:{mechanic_id}:{session_id}`, TTL 24h
- Se vuelca a MongoDB al superar 10 mensajes

### MongoDB (puerto 27017)
- Contenedor Docker: `motorconnect-mongodb`
- Gestiona: historial frío persistente de conversaciones
- Base de datos: `motorconnect_logs` / Colección: `conversation_logs`
- Índices: `mechanic_id`, `session_id` (unique), `motorcycle.model`, `tags`, TTL 1 año

## Dependencias sin uso

Tres dependencias están instaladas en `requirements.txt` pero **no tienen ningún import** en el código del proyecto:

| Paquete | Motivo de instalación original | Acción recomendada |
|---|---|---|
| `qdrant-client` | Vector store alternativo a Supabase | Eliminar de `requirements.txt` y el servicio `qdrant` de `docker-compose.yaml` |
| `groq` | LLM alternativo (Groq API) | Eliminar de `requirements.txt` y `GROQ_API_KEY` de `docker-compose.yaml` |
| `alembic` | Migraciones de DB | Eliminar de `requirements.txt` (se usa `create_all` en su lugar) |

## Oportunidades de optimización

### 1. Eliminar dependencias muertas (bajo riesgo, ganancia inmediata)
Quitar `qdrant-client`, `groq` y `alembic` de `requirements.txt`, el servicio `qdrant` del `docker-compose.yaml` y la variable `GROQ_API_KEY`. Reduce el tiempo de build de la imagen Docker y elimina un contenedor innecesario.

### 2. Consolidar el vector store
Qdrant está en el `docker-compose.yaml` pero no se conecta a nada en el código. El RAG ya usa Supabase pgvector de forma exclusiva. Eliminar Qdrant simplifica la infraestructura sin perder funcionalidad.

### 3. Simplificar el logging (decisión de arquitectura)
El patrón Redis → MongoDB agrega 2 servicios extra para gestionar historial de conversaciones. Para escala pequeña/media se puede reemplazar por una tabla en PostgreSQL (que ya existe), eliminando ambos servicios. El tradeoff es perder la flexibilidad de esquema que ofrece MongoDB para documentos de log.

### 4. Limpiar la configuración duplicada
`backend/config.py` exporta las mismas variables dos veces: como atributos del objeto `settings` y como variables globales sueltas (alias de compatibilidad). Se puede unificar gradualmente migrando los imports a `settings.*`.

## Estado de los contenedores Docker

| Servicio | Puerto | Estado real |
|---|---|---|
| `motorconnect-db` (PostgreSQL) | 5433 | ✅ Necesario |
| `motorconnect-redis` | 6379 | ✅ Necesario |
| `motorconnect-mongodb` | 27017 | ✅ Necesario |
| `motorconnect-qdrant` | 6333 | ❌ Sin uso — candidato a eliminar |
| `motorconnect-backend` | 8001 | ✅ Necesario |
| `motorconnect-web` | 5173 | ✅ Necesario |
