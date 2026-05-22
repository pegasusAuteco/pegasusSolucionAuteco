# MotorConnect

Web app (mobile-first responsive) for motorcycle repair shops. Employees can consult a RAG assistant for information about repairs, technical service, and fault diagnosis for motorcycles.

## New Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS |
| **Build Tool** | Vite |
| **Components** | Lucide React + Custom components |
| **State Management** | Zustand + TanStack Query |
| **Backend** | FastAPI (Python) |
| **Database** | PostgreSQL (usuarios) + Supabase pgvector (RAG) |
| **Session Cache** | Redis |
| **Logs** | MongoDB |
| **Vector Store** | Supabase pgvector |
| **LLM** | OpenAI gpt-4o-mini + text-embedding-3-small |

## Features

-  **Responsive Design** — Mobile-first, works on phones, tablets, desktop
-  **Chat RAG** — Ask questions about motorcycle repairs and diagnostics
-  **Conversation History** — Keep track of past conversations
-  **User Profile** — View usage statistics
-  **Admin Dashboard** — View all users' statistics
-  **JWT Authentication** — Secure employee & admin roles

## Auth Policy

- Password policy: 8-12 characters
- Must include at least one uppercase letter, one lowercase letter, and one number

## Project Structure

```
pegasusSolucionAuteco/
├── web/                        # Frontend React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/              # Rutas: login, chat, history, profile, admin
│   │   ├── components/         # Componentes reutilizables
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── layout/
│   │   │   └── workshop/
│   │   ├── store/              # Zustand: authStore, chatStore, workshopStore
│   │   ├── services/           # Axios + interceptores JWT
│   │   └── types/
│   ├── nginx.conf
│   └── Dockerfile
├── backend/                    # FastAPI (Python)
│   ├── auth/                   # JWT, roles, registro
│   ├── chat/                   # Endpoints de conversación + RAG
│   ├── rag/
│   │   ├── retrieval/          # Búsqueda semántica en Supabase
│   │   └── generation/         # Prompt + llamada al LLM
│   ├── logs/                   # Redis (hot) → MongoDB (cold)
│   ├── vector_store/           # Cliente Supabase pgvector
│   ├── database.py             # SQLAlchemy async engine
│   ├── config.py               # pydantic-settings
│   ├── main.py                 # FastAPI app entry point
│   ├── create_admin.py         # Script one-time: crear primer admin
│   ├── requirements.txt
│   └── Dockerfile
├── scripts/                    # Utilidades de setup y operaciones (one-time)
│   ├── ingestion/
│   │   └── ingestaManuales.py  # Carga PDFs de motos/ → Supabase manuales_chunks
│   └── db/
│       └── apply_schema.py     # Crea tablas en Supabase vía conexión directa
├── supabase/                   # Infraestructura de base de datos
│   └── schema_usuarios.sql     # DDL: tabla usuarios, enum roles, trigger updated_at
├── knowledge_base/             # fallas_comunes.json (base de diagnósticos)
├── motos/                      # PDFs de manuales técnicos de motos Auteco
├── documents/                  # Documentación interna del proyecto
├── docker-compose.yaml
├── .env
├── .env.example
└── README.md
```

## Roles and Test Credentials

The system manages three main roles with different access levels:

- **Mechanic** (`mecanico@pegasus.com` / `Meca1234`)

- Viewes only the Repair Queue.

- Accesses filtered data (Make/Model, License Plate, Notes).

- Has access to the AI ​​Chat for technical inquiries.

- **Secretary** (`secretario@pegasus.com` / `Secre1234`)

- Has access to the complete management of the Pegasus Workshop.

- Can register the entry of new motorcycles into the repair queue.

- Access to the chat and other management tools.

- **Admin** (`admin@pegasus.com` / `Admin1234`)

- Full access to all Secretary and Mechanic functionalities.

- Views the complete history, profile, and metrics of all users.



## User Flow

1. Employee opens web app → sees **login** screen
2. Signs in → redirected to **chat** screen
3. Starts **new chat** for each motorcycle repair case
4. Asks RAG agent about the problem (with context)
5. Checks **conversation history** to review past chats
6. Views **profile** to see their usage stats (admin sees all users)

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local dev)
- Python 3.11+ (for backend dev)

### Run with Docker

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Build and start services
docker-compose up -d

# 3. Access the app
# Frontend:    http://localhost:5173
# Backend API: http://localhost:8001
# Swagger:     http://localhost:8001/docs
# Database:    localhost:5433
```

## Scripts de setup (one-time)

```bash
# 1. Crear tablas en Supabase (requiere SUPABASE_DB_PASSWORD en .env)
python scripts/db/apply_schema.py

# 2. Crear primer usuario admin (requiere Docker con la BD corriendo)
docker exec motorconnect-backend python3 create_admin.py

# 3. Cargar manuales PDF a Supabase manuales_chunks (requiere OPENAI_API_KEY)
python scripts/ingestion/ingestaManuales.py
```

## Módulo de Diagnóstico de Fallas (RAG)

El sistema cuenta con un módulo especializado para diagnosticar problemas comunes en modelos específicos de Auteco, proporcionando una solución y un procedimiento paso a paso.

### Ingesta de Fallas
Para cargar la base de datos de conocimientos de fallas:

```bash
# Desde la raíz del proyecto
node ingestion/ingest_fallas.js
```

### Cómo usarlo
El agente Pegasus detectará automáticamente si tu consulta es un reporte de falla y consultará la base de datos de diagnósticos antes de buscar en los manuales técnicos, priorizando el paso a paso de revisión.
