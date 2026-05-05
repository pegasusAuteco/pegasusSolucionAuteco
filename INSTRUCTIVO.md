# Instructivo Técnico — MotorConnect

## Frontend (web/)

### Herramientas principales

| Herramienta | Versión | Propósito |
|---|---|---|
| **React 18** | ^18.2.0 | Librería UI para construir interfaces interactivas basadas en componentes reutilizables. Elegido por su ecosistema maduro y amplia adopción. |
| **TypeScript** | ^5.3.3 | Superset de JavaScript que añade tipado estático. Previene errores en tiempo de compilación y mejora la experiencia de desarrollo con autocompletado y documentación en el editor. |
| **Vite** | ^5.0.8 | Build tool ultrarrápido. Usa ES modules nativos en desarrollo (sin bundling) y Tree-shaking eficiente en producción. Reemplaza a Create React App por ser 10x más rápido. |
| **Tailwind CSS** | ^3.3.6 | Framework CSS utility-first. Permite construir diseños responsive sin salir del HTML. Las clases utilitarias evitan CSS spaghetti y facilitan mantener consistencia visual. |
| **Zustand** | ^4.4.1 | Biblioteca de estado global minimalista. Más simple que Redux (sin boilerplate, sin providers anidados). Ideal para apps de tamaño mediano con estado global acotado. |
| **TanStack Query** | ^5.28.0 | Manejo de estado asíncrono (fetching, caching, synchronización). Automatiza loading/error states, refetch en segundo plano y stale cache. Reduce drásticamente el código manual de API calls. |
| **React Router DOM** | ^6.20.0 | Enrutador SPA con carga diferida (lazy loading). Soporta nested routes, guards de autenticación y carga bajo demanda de páginas. |
| **Axios** | ^1.6.2 | Cliente HTTP con interceptors para JWT. Maneja automáticamente tokens vencidos y errores 401 globalmente. Más expresivo que fetch nativo. |
| **React Hook Form + Zod** | ^7.48.0 / ^3.22.4 | Formularios performantes (sin re-renders innecesarios) con validación de esquemas en typescript. Zod define tipos y validaciones en un solo lugar. |
| **Lucide React** | ^0.292.0 | Iconos SVG livianos como componentes React. Alternativa moderna a FontAwesome (sin CSS externo, tree-shakeable). |
| **tailwind-merge + clsx** | ^2.2.1 / ^2.0.0 | Composición inteligente de clases Tailwind. clsx condiciona clases, tailwind-merge resuelve conflictos entre clases. |
| **Vitest** | ^1.0.4 | Framework de tests nativo de Vite. Compatible con Jest API pero sin la complejidad de configuración. Se integra con Testing Library para tests de componentes. |
| **ESLint + Prettier** | ^8.55.0 / ^3.11.0 | ESLint asegura calidad de código (reglas por proyecto). Prettier formatea automáticamente (sin discusiones de estilo en el equipo). |

### Estructura de carpetas

```
src/
├── pages/       ← 1 archivo = 1 ruta (login, chat, history, profile, admin)
├── components/  ← UI reutilizable agrupada por dominio (auth, chat, layout, shared)
├── hooks/       ← Lógica de negocio reutilizable (useAuth, useChat)
├── services/    ← Comunicación con API (axios instance + service objects)
├── store/       ← Estado global (authStore, chatStore)
├── types/       ← Interfaces TypeScript compartidas
└── utils/       ← Funciones helper puras (cn)
```

---

## Backend (backend/)

### Herramientas principales

| Herramienta | Versión | Propósito |
|---|---|---|
| **FastAPI** | 0.115.0 | Framework web moderno para APIs REST. Soporte nativo de async/await, validación automática con Pydantic, documentación OpenAPI interactiva (/docs) generada automáticamente. Rendimiento comparable a Node.js/Go. |
| **Uvicorn** | 0.30.0 | Servidor ASGI de alto rendimiento. Necesario para correr FastAPI en producción. Soporta hot-reload en desarrollo. |
| **SQLAlchemy** | 2.0.35 | ORM más maduro de Python. Abstrae la base de datos relacional permitiendo cambiar de motor (PostgreSQL, SQLite, MySQL) sin modificar código de negocio. Versión 2.0 con sintaxis async nativa. |
| **asyncpg** | 0.29.0 | Driver PostgreSQL asyncronous nativo en Python. Hasta 3x más rápido que psycopg2. Necesario para que FastAPI + SQLAlchemy funcionen de forma realmente asíncrona. |
| **Alembic** | 1.13.0 | Migraciones de base de datos. Versiona el esquema de BD y permite rollback/upgrade entre versiones. Se integra con SQLAlchemy. |
| **python-jose** | 3.3.0 | Implementación de JWT (JSON Web Tokens) para autenticación. Maneja creación, firma y verificación de tokens con algoritmos como HS256 o RS256. |
| **passlib** | 1.7.4 | Hashing de contraseñas con bcrypt. Nunca almacenar contraseñas en texto plano. Bcrypt incluye sal automática y es resistente a ataques de fuerza bruta. |
| **Pydantic** | 2.9.0 | Validación de datos por tipos Python. FastAPI lo usa internamente para request/response. Versión 2.0 con motor Rust (pydantic-core) que es 5-50x más rápido. |
| **Qdrant Client** | 1.11.0 | Cliente oficial para Qdrant (vector store). Permite búsqueda semántica por embeddings. Usado para el RAG: indexar manuales técnicos y encontrar fragmentos relevantes por similitud. |
| **OpenAI** | 1.51.0 | SDK oficial de OpenAI para invocar modelos GPT. En el RAG se usa para generar respuestas basadas en el contexto recuperado de Qdrant. También compatible con Ollama (local). |
| **httpx** | 0.27.0 | Cliente HTTP asyncronous para Python. Se usa para comunicarse con APIs externas (LLMs, otros microservicios). Alternativa moderna a requests con soporte async. |
| **python-dotenv** | 1.0.1 | Carga variables de entorno desde archivo .env. Mantiene secretos (API keys, passwords) fuera del código fuente. |
| **python-multipart** | 0.0.12 | Necesario para que FastAPI procese formularios multipart (subida de archivos PDF a knowledge_base). |
| **motor** | 3.6.0 | Driver oficial de MongoDB para Python asíncrono. Permite operaciones de lectura/escritura en MongoDB sin bloquear el event loop de FastAPI. |
| **redis[asyncio]** | 5.0.8 | Cliente Redis asíncrono para Python. Permite acceso a sesiones en memoria desde FastAPI sin bloqueos. |
| **groq** | 0.11.0 | SDK oficial de GROQ para transcripción de voz con Whisper. Convierte audio del mecánico a texto para enviar al pipeline RAG. |

### Estructura de carpetas

```
backend/
├── auth/          ← Lógica de autenticación (login, register, JWT)
├── chat/
│   ├── models/    ← Modelos SQLAlchemy (Message, Conversation, Motorcycle)
│   └── use_cases/ ← Casos de uso del chat (reglas de negocio)
├── history/       ← CRUD de conversaciones anteriores
├── rag/
│   ├── ingestion/ ← Carga de manuales PDF → embeddings → Qdrant
│   ├── retrieval/ ← Búsqueda semántica e híbrida en Qdrant
│   └── generation/← Prompt engineering + llamado a LLM
├── analytics/     ← Estadísticas de uso por rol
├── vector_store/  ← Configuración y conexión a Qdrant
└── logs/          ← Módulo NoSQL: sesiones Redis + historial MongoDB
    ├── connections.py   ← Conexiones async a Redis y MongoDB
    ├── log_schemas.py   ← Modelos Pydantic para mensajes y sesiones
    ├── log_service.py   ← Lógica: crear sesión, append, flush, historial
    ├── log_router.py    ← 5 endpoints REST (pendiente integración en main.py)
    └── init_indexes.py  ← Script one-time para crear índices MongoDB
```

---

## Infraestructura

| Herramienta | Versión | Propósito |
|---|---|---|
| **Docker + Compose** | Conteneriza todos los servicios (web, backend, DB, vector store). Un solo comando (`docker-compose up -d`) levanta el stack completo. Aísla dependencias del sistema host. |
| **PostgreSQL 16** | Base de datos relacional para datos estructurados (usuarios, conversaciones, mensajes). Versión 16 con mejoras de performance y seguridad. |
| **Qdrant** | Vector store para búsqueda semántica. Almacena embeddings de manuales técnicos y permite consultas por similitud de significado (no solo palabras clave). |
| **Redis Stack** | 6.2 | Almacenamiento en memoria para sesiones activas de conversación. Latencia < 1ms. Expulsa sesiones antiguas automáticamente (LRU) cuando la memoria llega al límite configurado (512 MB). |
| **MongoDB** | 7.0 | Base de datos NoSQL para logs históricos de conversaciones. Almacenamiento nativo de documentos JSON (BSON). Escalable horizontalmente con sharding. TTL automático de documentos a 1 año. |
| **Nginx** | Servidor web en producción. Sirve el frontend build-eado, aplica caché de assets estáticos, compresión gzip y proxy reverso al backend. |

---

## Base de Datos NoSQL — Logs de Conversaciones

### Arquitectura Hot/Cold (Redis + MongoDB)

El sistema maneja los logs de conversaciones de mecánicos en dos capas según la frecuencia de acceso:

```
SESIÓN ACTIVA (en curso)
       ↓
┌─────────────┐
│    REDIS    │  ← Memoria caliente: contexto activo (últimos 20 msgs)
│   TTL: 24h  │     Latencia: <1ms | Se expulsa con LRU al llenar RAM
└──────┬──────┘
       │  Flush automático cada 10 mensajes o al cerrar sesión
       ↓
┌─────────────┐
│   MongoDB   │  ← Almacenamiento frío: historial completo y persistente
│  TTL: 1 año │     JSON nativo | Escalable | Índices optimizados
└─────────────┘
```

**¿Por qué dos capas y no solo una?**

| Criterio | Solo MongoDB | Solo Redis | Redis + MongoDB ✅ |
|---|---|---|---|
| Latencia consulta activa | ~30ms | <1ms | <1ms |
| Persistencia garantizada | ✅ | ⚠️ Volátil | ✅ |
| Costo de RAM | Bajo | Alto | Óptimo |
| Escalabilidad horizontal | ✅ | ✅ | ✅ |
| Ideal para GROQ/voz | Lento | No persiste | ✅ |

---

### Flujo completo con GROQ (comandos por voz)

```
Mecánico habla → micrófono
       ↓
[1] GROQ Whisper transcribe audio → texto
       ↓
[2] FastAPI recibe texto transcrito
       ↓
[3] Lee contexto de Redis (últimos 20 mensajes del mecánico)
       ↓
[4] Pipeline RAG: contexto + pregunta → Qdrant → LLM → respuesta
       ↓
[5] Guarda nuevo par pregunta/respuesta en Redis
       ↓
[6] Si hay ≥ 10 mensajes → flush automático a MongoDB
       ↓
[7] Al cerrar sesión → flush final + limpieza de Redis
```

---

### Estructura del documento MongoDB

```json
{
  "_id": "ObjectId",
  "mechanic_id": "usr_abc123",
  "session_id": "sess_xyz789",
  "motorcycle": {
    "brand": "Honda",
    "model": "CB190R",
    "year": 2023
  },
  "started_at": "2026-05-05T07:00:00Z",
  "last_activity": "2026-05-05T07:45:00Z",
  "messages": [
    {
      "role": "user",
      "content": "La moto no enciende en frío",
      "timestamp": "2026-05-05T07:01:00Z",
      "input_type": "voice",
      "transcription_confidence": 0.97
    },
    {
      "role": "assistant",
      "content": "Para la CB190R en frío, revise el carburador...",
      "timestamp": "2026-05-05T07:01:03Z"
    }
  ],
  "tags": ["arranque", "carburador", "CB190R"]
}
```

**Índices creados en MongoDB (`motorconnect_logs.conversation_logs`)**

| Índice | Tipo | Propósito |
|---|---|---|
| `{ mechanic_id: 1, started_at: -1 }` | Compuesto | Historial por mecánico ordenado por fecha |
| `{ session_id: 1 }` | Único | Búsqueda rápida de sesión + previene duplicados |
| `{ "motorcycle.model": 1 }` | Campo anidado | Analytics por modelo de moto |
| `{ tags: 1 }` | Array | Búsqueda por categoría de problema |
| `{ started_at: 1 }` | TTL (1 año) | Borrado automático de logs antiguos |

---

### Endpoints del módulo `backend/logs/`

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/logs/session` | Crear nueva sesión de conversación |
| `POST` | `/api/logs/message` | Agregar mensaje a sesión activa |
| `GET` | `/api/logs/context/{mechanic_id}/{session_id}` | Obtener contexto activo (desde Redis) |
| `DELETE` | `/api/logs/session/{mechanic_id}/{session_id}` | Cerrar sesión y persistir en MongoDB |
| `GET` | `/api/logs/history/{mechanic_id}` | Historial de sesiones del mecánico |

**Integración pendiente (backend dev):** Agregar en `backend/main.py`:

```python
from logs.log_router import router as logs_router
app.include_router(logs_router, prefix="/api/logs", tags=["logs"])
```

**Variables de entorno requeridas**

```bash
MONGO_URI=mongodb://motorconnect:password@mongodb:27017/motorconnect_logs
MONGO_DB_NAME=motorconnect_logs
REDIS_URL=redis://redis:6379/0
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

---

## Flujo de datos (RAG)

```
Usuario escribe pregunta
       ↓
Cliente React → POST /api/chat/ → FastAPI
       ↓
FastAPI recibe pregunta
       ↓
1. Retrieval: busca fragmentos similares en Qdrant (por embedding)
2. Generation: construye prompt con contexto + pregunta → OpenAI / Ollama
3. Almacena: guarda pregunta y respuesta en PostgreSQL
       ↓
Respuesta → React renderiza en ChatBubble
```

Las herramientas están elegidas para maximizar **productividad del desarrollador** (TypeScript, React Query, Zustand, FastAPI), **rendimiento** (Vite, asyncpg, Pydantic v2) y **escalabilidad** (Docker, PostgreSQL, Qdrant).
