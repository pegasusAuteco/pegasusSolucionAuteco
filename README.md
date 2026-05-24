# Pegasus — Asistente RAG para Talleres de Motos

Web app mobile-first para talleres de motos Auteco. Los empleados consultan un asistente RAG para información técnica, manuales y diagnóstico de fallas.

## Stack

| Capa | Tecnología | Proveedor |
|------|-----------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS | — |
| Build | Vite | — |
| Estado | Zustand + TanStack Query | — |
| Backend | FastAPI (Python 3.11) | — |
| Base de datos | PostgreSQL | Supabase (nube) |
| Vector Store | pgvector | Supabase (nube) |
| Logs de conversación | MongoDB | Atlas (nube) |
| Sesiones activas | Redis | Upstash (nube) |
| LLM + Embeddings | GPT-4o-mini + text-embedding-3-small | OpenAI |

## Funcionalidades

- Chat RAG — consultas sobre reparaciones, fichas técnicas y diagnóstico de fallas
- Historial de conversaciones por usuario
- Perfil con estadísticas de uso
- Panel de administración con métricas de todos los usuarios
- Autenticación JWT con roles (mecánico, secretario, admin)

## Estructura del Proyecto

```
pegasusSolucionAuteco/
├── web/                        # Frontend React + Vite
│   ├── src/
│   │   ├── pages/              # login, chat, history, profile, admin
│   │   ├── components/         # auth, chat, layout, workshop
│   │   ├── hooks/              # useChat, useAuth, useChatUI
│   │   ├── store/              # Zustand: authStore, chatStore
│   │   ├── services/           # API client con JWT
│   │   └── types/
│   ├── nginx.conf
│   └── Dockerfile
├── backend/                    # FastAPI
│   ├── auth/                   # JWT, roles, login, registro
│   ├── chat/                   # Conversaciones + pipeline RAG
│   ├── rag/
│   │   ├── retrieval/          # Búsqueda semántica en Supabase
│   │   └── generation/         # Prompt + LLM
│   ├── logs/                   # Redis (hot) → MongoDB (cold)
│   ├── config.py               # Variables de entorno
│   ├── main.py                 # Entry point FastAPI
│   ├── create_admin.py         # Crea el primer usuario admin
│   └── requirements.txt
├── scripts/
│   ├── ingestion/
│   │   └── ingestaManuales.py  # Carga PDFs → Supabase manuales_chunks
│   └── db/
│       └── apply_schema.py     # Aplica schema SQL en Supabase
├── supabase/
│   └── schema_usuarios.sql     # DDL: tabla usuarios, roles, triggers
├── knowledge_base/             # fallas_comunes.json
├── motos/                      # PDFs de manuales técnicos Auteco
├── docker-compose.yaml
├── .env.example
└── SETUP.md                    # Guia de instalacion paso a paso
```

## Roles

| Rol | Acceso |
|-----|--------|
| Mecánico | Cola de reparaciones + chat RAG |
| Secretario | Gestión completa del taller + chat |
| Admin | Todo lo anterior + métricas de todos los usuarios |

## Arrancar el proyecto

Ver [SETUP.md](./SETUP.md) para instrucciones completas con y sin Docker.

```bash
# Resumen rapido con Docker
docker compose up -d --build
```

- Frontend: http://localhost:5173
- API docs: http://localhost:8001/docs

## Scripts de setup (solo una vez)

```bash
# Crear primer usuario admin (con Docker corriendo)
docker exec motorconnect-backend python3 create_admin.py

# Cargar manuales PDF a Supabase (requiere OPENAI_API_KEY)
python scripts/ingestion/ingestaManuales.py

# Aplicar schema SQL en Supabase
python scripts/db/apply_schema.py
```

## Modulo de Diagnostico de Fallas

El sistema detecta automáticamente si la consulta es un diagnóstico de falla y busca en `fallas_comunes.json` antes de los manuales técnicos, entregando un paso a paso de revisión.
