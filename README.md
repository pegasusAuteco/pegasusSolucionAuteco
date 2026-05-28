# Pegasus — Asistente RAG para Talleres de Motos

Web app mobile-first para talleres de motos Auteco. Los empleados consultan un asistente RAG para información técnica, manuales y diagnóstico de fallas, y gestionan el flujo completo del taller.

## Stack

| Capa | Tecnología | Proveedor |
|------|-----------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS | — |
| Build | Vite | — |
| Estado | Zustand (cliente) + TanStack Query (servidor) | — |
| HTTP | `fetch` nativo vía `apiFetch` wrapper | — |
| Backend | FastAPI (Python 3.11) | — |
| Base de datos auth/chat | PostgreSQL | Supabase (nube) |
| Vector Store | pgvector | Supabase (nube) |
| Vector Store local | Qdrant | Docker |
| Logs de conversación | MongoDB | Atlas (nube) |
| Sesiones activas | Redis | Upstash (nube) |
| LLM + Embeddings | GPT-4o-mini + text-embedding-3-small | OpenAI |
| Transcripción de voz | Whisper (via Groq) | Groq — opcional |

## Funcionalidades

- **Chat RAG** — consultas sobre reparaciones, fichas técnicas y diagnóstico de fallas
- **Módulo de taller** — registro de ingreso de motos, cola del mecánico, gestión de repuestos y estado de reparación
- **Entrada de voz** — grabación de audio con transcripción vía Groq Whisper
- **Adjunto de imágenes** — envío de imágenes en el chat
- **Historial de conversaciones** por usuario
- **Perfil con estadísticas** de uso personal
- **Panel de administración** con métricas globales
- **Autenticación JWT** con roles (mecánico, secretario, admin)
- **Modo oscuro** en toda la interfaz

## Estructura del Proyecto

```
pegasusSolucionAuteco/
├── web/                            # Frontend React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/                  # LoginPage, RegisterPage, ChatPage,
│   │   │                           # WorkshopPage, MechanicPage,
│   │   │                           # HistoryPage, ProfilePage, AdminPage
│   │   ├── components/
│   │   │   ├── auth/               # ProtectedRoute (guard por rol)
│   │   │   ├── chat/               # ChatContainer, ChatBubble, ChatInput
│   │   │   ├── inventory/          # MotorcycleCard, MotorcycleList
│   │   │   ├── layout/             # Layout, Navbar
│   │   │   ├── shared/             # EmptyState, ToastViewport
│   │   │   └── workshop/           # ReceptionForm, MechanicDashboard,
│   │   │                           # MotorcycleCard, CompactMechanicQueue,
│   │   │                           # InvoiceModal
│   │   ├── contexts/               # ChatContext, WorkshopContext
│   │   ├── hooks/                  # useAuth, useChat, useChatUI, useWorkshop
│   │   ├── lib/
│   │   │   ├── fetch.ts            # apiFetch — fetch nativo con JWT e interceptor 401
│   │   │   └── supabase.ts         # Cliente Supabase
│   │   ├── services/
│   │   │   ├── api.ts              # authService, chatService, analyticsService
│   │   │   ├── workshopService.ts  # CRUD motos en Supabase
│   │   │   └── supabaseAuthService.ts
│   │   ├── store/                  # Zustand: authStore, toastStore
│   │   ├── types/                  # Interfaces globales TypeScript
│   │   └── utils/
│   │       └── dates.ts            # getLocalISODate, formatRelativeTime
│   ├── nginx.conf
│   └── Dockerfile
├── backend/                        # FastAPI
│   ├── auth/                       # JWT, roles, login, registro
│   ├── chat/                       # Conversaciones + pipeline RAG
│   ├── rag/
│   │   ├── retrieval/              # Búsqueda semántica en Supabase pgvector
│   │   └── generation/             # Construcción de prompt + llamada GPT-4o-mini
│   ├── logs/                       # Redis (hot) → MongoDB (cold)  [router pendiente de montar]
│   ├── analytics/                  # Estadísticas de uso            [en desarrollo]
│   ├── history/                    # Endpoints de historial          [en desarrollo]
│   ├── vector_store/               # Cliente Supabase pgvector
│   ├── scripts/
│   │   └── ingest_fallas.py        # Carga fallas_comunes.json
│   ├── config.py                   # Variables de entorno (pydantic Settings)
│   ├── database.py                 # Conexión SQLAlchemy async
│   ├── main.py                     # Entry point FastAPI + routers montados
│   ├── create_admin.py             # Crea el primer usuario admin
│   └── requirements.txt
├── scripts/
│   ├── ingestion/
│   │   └── ingestaManuales.py      # Carga PDFs → Supabase manuales_chunks
│   └── db/
│       └── apply_schema.py         # Aplica schema SQL en Supabase
├── supabase/
│   ├── schema_usuarios.sql         # DDL: tabla usuarios, roles, triggers
│   ├── migration_roles.sql         # Migración de roles
│   └── add_phone_column.sql        # Migración: columna phone en motorcycles
├── knowledge_base/                 # fallas_comunes.json
├── motos/                          # PDFs de manuales técnicos Auteco
├── docker-compose.yaml
├── .env.example
└── SETUP.md                        # Guía de instalación paso a paso
```

## Roles

| Rol | Acceso |
|-----|--------|
| `mecanico` | Cola de reparaciones + chat RAG |
| `secretario` | Gestión completa del taller + chat |
| `admin` | Todo lo anterior + métricas de todos los usuarios |

## Arrancar el proyecto

Ver [SETUP.md](./SETUP.md) para instrucciones completas con y sin Docker.

```bash
# Resumen rápido con Docker
docker compose up -d --build
```

Servicios disponibles:

| Servicio | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API / Swagger | http://localhost:8001/docs |
| PostgreSQL | localhost:5433 |
| MongoDB | localhost:27018 |
| Redis | localhost:6379 |
| Qdrant | http://localhost:6333 |

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

```bash
# Requeridas
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=
DATABASE_URL=
MONGO_URI=
JWT_SECRET=

# Opcionales
GROQ_API_KEY=       # Habilita transcripción de voz con Whisper
```

Los servicios locales (PostgreSQL, MongoDB, Redis, Qdrant) tienen valores por defecto en `docker-compose.yaml`.

## Scripts de setup (solo una vez)

```bash
# Crear primer usuario admin (con Docker corriendo)
docker exec motorconnect-backend python3 create_admin.py

# Cargar manuales PDF a Supabase (requiere OPENAI_API_KEY)
python scripts/ingestion/ingestaManuales.py

# Aplicar schema SQL en Supabase
python scripts/db/apply_schema.py

# Crear índices MongoDB para logs
python backend/logs/init_indexes.py
```

## Flujo RAG

```
Usuario → POST /chat/conversations/{id}/messages
    ↓
1. Embed consulta con text-embedding-3-small (OpenAI)
2. Búsqueda semántica en Supabase pgvector (top 5 chunks)
3. Recuperar historial: Redis (activo) o MongoDB (frío)
4. Construir prompt: sistema + últimos 10 mensajes + contexto + consulta
5. Llamar GPT-4o-mini → respuesta
    ↓
Guardar en Redis (TTL 24h) + MongoDB (TTL 1 año)
```

## Módulo de Diagnóstico de Fallas

El sistema detecta automáticamente si la consulta es un diagnóstico de falla y busca en `knowledge_base/fallas_comunes.json` antes de los manuales técnicos, entregando un paso a paso de revisión.
