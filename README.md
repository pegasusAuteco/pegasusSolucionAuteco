# MotorConnect — Pegasus

Web platform for **Auteco Mobility** motorcycle workshops. Centralizes motorcycle intake, the mechanic's work queue, and an AI technical assistant that answers questions about official manuals in real time.

---

| Layer | Technology | Provider |
|------|-----------|-----------|
| Frontend | React 18 + JavaScript + Vite | — |
| BFF | Express (Node 20) | — |
| State | Zustand | — |
| AI Backend | FastAPI (Python 3.11) | — |
| Auth/chat database | PostgreSQL | Supabase (cloud) |
| Vector store | pgvector | Supabase (cloud) |
| Conversation logs | MongoDB | Atlas (cloud) |
| Active sessions | Redis | Upstash (cloud) |
| LLM + Embeddings | GPT-4o-mini + text-embedding-3-small | OpenAI |
| Voice transcription | Whisper (via Groq) | Groq — optional |

## Key features

- **Pegasus assistant:** token-by-token streaming chatbot, semantic search over technical manuals (RAG), and failure diagnosis
- **Motorcycle intake:** digital intake form with validation, mechanic assignment, and status tracking
- **Mechanic dashboard:** work queue with no customer PII
- **Role-based auth:** mechanic, secretary, and admin with automatic role-based redirection
- **Voice input** — audio recording with transcription via Groq Whisper
- **Conversation history** per user
- **Admin panel** with global metrics
- **Dark mode** across the whole interface

---

## Getting started

See **[SETUP.md](./SETUP.md)** for installation requirements, environment variables, Docker setup, test credentials, and troubleshooting.

---

## Folder structure

```
pegasusSolucionAuteco/
├── bff/                        # BFF — Express + Node
│   └── src/
│       ├── middleware/         # requireAuth, rateLimiter
│       ├── routes/             # auth, workshop, history, proxy
│       ├── services/           # authService, workshopService, supabaseClient
│       └── websocket/          # chatWsProxy — WebSocket bridge BFF↔FastAPI
├── backend/                    # AI Backend — FastAPI + Python
│   ├── auth/                   # JWT, roles, login, register
│   ├── chat/                   # Conversations + WebSocket endpoint
│   ├── rag/
│   │   ├── retrieval/          # Semantic search on Supabase pgvector
│   │   └── generation/         # Prompt + OpenAI streaming
│   ├── voice/                  # Transcription/TTS (Groq Whisper)
│   ├── admin/                  # Admin and manuals endpoints
│   ├── analytics/              # Usage statistics
│   ├── logs/                   # History in Redis (hot) → MongoDB (cold)
│   └── create_test_users.py    # Script to create test users
├── web/                        # Frontend — React + Vite (JS)
│   └── src/
│       ├── components/         # chat, workshop, layout, shared
│       ├── hooks/              # useAuth, useChat, useChatWebSocket, useWorkshop
│       ├── pages/              # Login, Chat, Workshop, Mechanic, Admin
│       ├── services/           # api.js (HTTP client)
│       ├── store/              # authStore, toastStore (Zustand)
│       └── lib/                # fetch.js (wrapper with timeout and error handling)
├── supabase/
│   └── schema.sql              # Full idempotent schema
├── docs/
│   └── ARQUITECTURA.md         # Detailed architecture, flows, and technical decisions
├── docker-compose.yaml
└── .env.example
```

## RAG flow

```
User → POST /chat/conversations/{id}/messages
    ↓
1. Embed the query with text-embedding-3-small (OpenAI)
2. Semantic search on Supabase pgvector (top 5 chunks)
3. Fetch history: Redis (hot) or MongoDB (cold)
4. Build prompt: system + last 10 messages + context + query
5. Call GPT-4o-mini → answer
    ↓
Store in Redis (24h TTL) + MongoDB (1 year TTL)
```

## Documentation

- **[docs/ARQUITECTURA.md](./docs/ARQUITECTURA.md)** — System architecture, auth and chat flows, technical decisions, and known debt
- **[SETUP.md](./SETUP.md)** — Step-by-step installation guide, troubleshooting, and useful commands