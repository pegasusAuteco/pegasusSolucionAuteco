# MotorConnect — Pegasus

Plataforma web para talleres de motocicletas **Auteco Mobility**. Centraliza la recepción de motos, la gestión de la cola del mecánico y un asistente técnico con IA que responde preguntas sobre manuales oficiales en tiempo real.

---

## Características principales

- **Asistente Pegasus:** chatbot con streaming token a token, búsqueda semántica sobre manuales técnicos (RAG) y diagnóstico de fallas
- **Recepción de motos:** formulario digital de ingreso con validación, asignación a mecánico y seguimiento de estado
- **Panel del mecánico:** cola de trabajo sin datos PII del cliente
- **Autenticación por roles:** mecánico, secretario y admin con redirección automática por rol

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Docker + Docker Compose | 24+ |
| Node.js (solo para dev del frontend fuera de Docker) | 20 LTS |
| Python | 3.11 (incluido en la imagen Docker) |

---

## Levantar el proyecto

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd pegasusSolucionAuteco
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y completa las variables requeridas:

| Variable | Descripción |
|---|---|
| `OPENAI_API_KEY` | Clave de API de OpenAI |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Clave `service_role` de Supabase |
| `JWT_SECRET` | Secreto para firmar tokens (mín. 32 chars) |
| `SESSION_SECRET` | Secreto para sesiones del BFF (mín. 32 chars) |
| `MONGO_URI` | URI de conexión a MongoDB |
| `QDRANT_API_KEY` | Clave de Qdrant |

### 3. Levantar todos los servicios

```bash
docker compose up
```

Servicios disponibles:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5174 |
| BFF (API) | http://localhost:3000 |
| Backend FastAPI docs | http://localhost:8000/docs |

### 4. (Primera vez) Crear usuarios de prueba

```bash
# Agregar los roles al enum de PostgreSQL
docker compose exec db psql -U motorconnect -d motorconnect_db -c "
  ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'secretario';
  ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'mecanico';
"

# Crear usuarios
docker compose exec backend python create_test_users.py
```

### 5. Desarrollo del frontend fuera de Docker (opcional)

```bash
cd web
npm install
npm run dev
```

---

## Credenciales de prueba

| Rol | Email | Password | Acceso |
|---|---|---|---|
| admin | admin@pegasus.com | *(ver `.env`)* | Todo |
| secretario | secretario@pegasus.com | `TallerPassword123!` | Taller + chat |
| mecanico | mecanico@pegasus.com | `TallerPassword123!` | Cola + chat |

---

## Estructura de carpetas

```
pegasusSolucionAuteco/
├── bff/                        # BFF — Express + Node
│   └── src/
│       ├── middleware/         # requireAuth, rateLimiter
│       ├── routes/             # auth, workshop, history, proxy
│       ├── services/           # authService, workshopService, supabaseClient
│       └── websocket/          # chatWsProxy — bridge WebSocket BFF↔FastAPI
├── backend/                    # Backend IA — FastAPI + Python
│   ├── auth/                   # JWT, roles, login, registro
│   ├── chat/                   # Conversaciones + endpoint WebSocket
│   ├── rag/
│   │   ├── retrieval/          # Búsqueda semántica en Qdrant
│   │   └── generation/         # Prompt + OpenAI streaming
│   ├── logs/                   # Historial en MongoDB
│   └── create_test_users.py    # Script para crear usuarios de prueba
├── web/                        # Frontend — React + Vite (JS)
│   └── src/
│       ├── components/         # chat, workshop, layout, shared
│       ├── hooks/              # useAuth, useChat, useChatWebSocket, useWorkshop
│       ├── pages/              # Login, Chat, Workshop, Mechanic, Admin
│       ├── services/           # api.js (HTTP client)
│       ├── store/              # authStore, toastStore (Zustand)
│       └── lib/                # fetch.js (wrapper con timeout y error handling)
├── supabase/
│   └── schema.sql              # Schema completo idempotente
├── docs/
│   └── ARQUITECTURA.md         # Arquitectura detallada, flujos y decisiones técnicas
├── docker-compose.yaml
└── .env.example
```

---

## Documentación

- **[docs/ARQUITECTURA.md](./docs/ARQUITECTURA.md)** — Arquitectura del sistema, flujos de autenticación y chat, decisiones técnicas y deuda conocida
- **[CLAUDE.md](./CLAUDE.md)** — Guía interna de Claude: fases de migración, decisiones y pendientes *(no incluido en el repo remoto)*
