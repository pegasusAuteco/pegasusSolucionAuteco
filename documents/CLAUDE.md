# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MotorConnect / Pegasus** is a mobile-first web app for Auteco motorcycle repair shops. Mechanics consult a RAG-powered AI agent (Pegasus) for repair guidance, technical service, and fault diagnosis. Admins view usage analytics.

## Commands

### Frontend (`web/`)
```bash
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # Production bundle → /dist
npm run lint         # ESLint (max-warnings 0)
npm run type-check   # tsc --noEmit
npm run format       # Prettier
```

### Backend (`backend/`)
```bash
# Recommended: full stack via Docker
docker compose up -d --build

# Backend only (requires all services running)
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Create first admin user (after DB is up)
docker exec motorconnect-backend python3 create_admin.py
```

### Ingestion (one-time, `ingestion/`)
```bash
node ingestion/ingest_fallas.js   # Load fallas_comunes.json → Supabase
node ingestion/ingest.js          # Load PDFs from /motos → Supabase vectors
```

### Health check
```bash
curl http://localhost:8001/health
# Swagger docs: http://localhost:8001/docs
```

## Architecture

```
[React SPA (web/)] → axios /api/* with JWT
    → [FastAPI backend (backend/)]
         → auth: JWT issue & validation (PostgreSQL users table)
         → chat: conversation CRUD + RAG pipeline trigger
              → RAG retrieval: embed query → Supabase RPC
                  match_fallas_diagnostico() (top 2)
                  match_manuales_chunks()    (top 5)
              → RAG generation: GPT with context + last 10 messages
              → logging: Redis (hot, < 24h) → MongoDB (cold, flush at 10+ msgs)
```

**Services (docker-compose):**
| Service | Port | Purpose |
|---------|------|---------|
| postgres:16 | 5433 | Users, conversations, messages |
| Supabase | external | Vector store (pgvector) for RAG |
| redis:7 | 6379 | Active session cache |
| mongodb:7 | 27017 | Persistent conversation logs |
| backend | 8001 | FastAPI (internal 8000) |
| web | 5173 | React/Nginx |

## Key Files

**Backend entry points:**
- [backend/main.py](backend/main.py) — FastAPI app, middleware, router registration, lifespan (DB init + Redis/Mongo startup)
- [backend/config.py](backend/config.py) — pydantic-settings environment validation
- [backend/chat/router.py](backend/chat/router.py) — chat endpoints; RAG pipeline is triggered here on `POST /chat/conversations/{id}/messages`
- [backend/rag/retrieval/retriever.py](backend/rag/retrieval/retriever.py) — Supabase RPC calls for vector search
- [backend/rag/generation/generator.py](backend/rag/generation/generator.py) — system prompt + GPT call (temp 0.3, max 300 tokens)
- [backend/logs/log_service.py](backend/logs/log_service.py) — Redis hot / MongoDB cold session management

**Frontend entry points:**
- [web/src/App.tsx](web/src/App.tsx) — React Router routes + auth guards
- [web/src/services/api.ts](web/src/services/api.ts) — Axios instance with JWT interceptors; all API calls are defined here
- [web/src/store/](web/src/store/) — Zustand stores: `authStore`, `chatStore`, `workshopStore`, `toastStore`

## Environment Setup

```bash
cp .env.example .env   # fill in OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
docker compose up -d
```

Key variables — note the distinction:
- `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` → vector search (Supabase pgvector, external)
- `DATABASE_URL` → PostgreSQL inside Docker (users/conversations)
- `MONGO_URI` → MongoDB inside Docker (logs)
- `REDIS_URL` → Redis inside Docker (sessions)
- `LLM_MODEL=gpt-4o-mini`, `EMBEDDING_MODEL=text-embedding-3-small`

## RAG Pipeline Details

The RAG pipeline is invoked synchronously inside the chat message endpoint:

1. **Retrieval**: user query → OpenAI embedding → two Supabase RPC calls:
   - `match_fallas_diagnostico` (fault DB, top 2 matches)
   - `match_manuales_chunks` (technical manuals, top 5 matches)
2. **Generation**: `generate_answer()` in [generator.py](backend/rag/generation/generator.py) builds a prompt with context chunks + last 10 messages from Redis session, calls GPT with `temperature=0.3, max_tokens=300`.
3. **Logging**: message appended to Redis session; when session exceeds 10 messages it flushes to MongoDB.

Pegasus agent auto-prioritizes `fallas_diagnostico` results when the query matches a fault pattern. The system prompt enforces bullet-only responses with zero filler text.

## Authentication

- JWT 24h expiration via `python-jose`
- Password policy: 8–12 chars, 1 uppercase, 1 lowercase, 1 number (enforced in `auth/service.py`)
- Roles: `employee` (chat + history + profile), `admin` (+ all users' analytics)
- Frontend: Zustand `authStore` persists token to localStorage; Axios interceptor injects `Authorization: Bearer <token>`; 401 response → redirect to `/login`

## Knowledge Base & Ingestion

- [motos/](motos/) — 12 PDF motorcycle technical manuals (Benelli, Advance, Agility, etc.)
- [knowledge_base/fallas_comunes.json](knowledge_base/fallas_comunes.json) — structured fault DB with model, symptom, root cause, solution, and step-by-step procedure
- Both are ingested via Node.js scripts in [ingestion/](ingestion/) into Supabase pgvector tables

## Active Development Notes

- **No automated tests** — testing is manual via browser and `curl`
- The `feature/motoRegist` branch adds the Workshop module: [ReceptionForm](web/src/components/workshop/ReceptionForm.tsx), [MotorcycleCard](web/src/components/workshop/MotorcycleCard.tsx), [workshopStore](web/src/store/workshopStore.ts)
- SQLAlchemy is used with `asyncpg` for async DB access; models auto-create tables on startup via `Base.metadata.create_all` (no Alembic migrations in use)
- `CORS allow_origins=["*"]` — restrict to frontend domain before production
- Codebase comments and UI are in Spanish; variable names mix Spanish/English
