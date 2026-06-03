# Instructivo Técnico — MotorConnect

## Arquitectura general

```
Browser (React + Vite, JS puro)
  │  HTTP REST + WebSocket
  ▼
BFF — Express + Node :3000
  │  Auth, sesiones Redis, proxy HTTP+WS, rate limiting
  ├─► Supabase (datos del taller: ingresos, mecánicos, motos)
  └─► FastAPI :8000 (IA/RAG, chat, autenticación JWT)
        └─► OpenAI (LLM streaming + embeddings)
        └─► Qdrant (vector search)
        └─► MongoDB (historial de conversaciones)
        └─► PostgreSQL local (usuarios)
```

---

## Frontend (`web/`)

### Herramientas principales

| Herramienta | Versión | Propósito |
|---|---|---|
| **React 18** | ^18.2.0 | Librería UI basada en componentes. Ecosistema maduro, amplia adopción. |
| **Vite** | ^5.4.x | Build tool ultrarrápido con ES modules nativos en dev. Reemplaza Create React App por ser 10x más rápido. |
| **JavaScript (ES2022)** | — | El frontend usa JS puro, sin TypeScript. Migrado en Fase 3 para simplificar el stack. |
| **Tailwind CSS** | ^3.3.x | Framework CSS utility-first. Diseños responsive sin salir del JSX. Evita CSS spaghetti. |
| **Zustand** | ^4.4.x | Estado global minimalista. Sin boilerplate ni providers anidados. Ideal para estado acotado. |
| **TanStack Query** | ^5.x | Estado asíncrono: fetching, caching, sincronización. Reduce el código manual de API calls. |
| **React Router DOM** | ^6.x | Enrutador SPA con lazy loading y guards de autenticación por rol. |
| **React Hook Form + Zod** | ^7.x / ^3.x | Formularios sin re-renders innecesarios. Zod valida en runtime (no TypeScript). |
| **Lucide React** | ^0.x | Iconos SVG livianos como componentes React. Tree-shakeable, sin CSS externo. |
| **ESLint + Prettier** | — | Calidad y formato de código. Configurado para `.js` y `.jsx`. |

### Cómo se comunica el frontend con el backend

El frontend **solo habla con el BFF** (`http://localhost:3000`). Nunca llama directamente a FastAPI.

- **HTTP REST:** `web/src/lib/fetch.js` — wrapper sobre `fetch` nativo con timeout (15s por defecto, 120s para mensajes de chat) y manejo de errores.
- **WebSocket:** `web/src/hooks/useChatWebSocket.js` — streaming token a token del asistente. Reconexión automática hasta 3 intentos. Si el WS no conecta en 3 segundos, cae en fallback HTTP.

### Estructura de carpetas

```
web/src/
├── main.jsx
├── App.jsx
├── index.css
├── lib/
│   ├── fetch.js          ← wrapper HTTP con timeout y error handling
│   └── supabase.js       ← cliente Supabase (solo lectura pública)
├── utils/
│   └── dates.js
├── store/
│   ├── authStore.js      ← usuario autenticado (Zustand)
│   └── toastStore.js     ← notificaciones (máx. 3 simultáneas)
├── services/
│   ├── api.js            ← funciones de llamada al BFF
│   └── workshopService.js
├── hooks/
│   ├── useAuth.js
│   ├── useChat.js
│   ├── useChatWebSocket.js  ← WebSocket streaming
│   ├── useChatUI.js
│   └── useWorkshop.js
├── contexts/
│   ├── ChatContext.jsx
│   └── WorkshopContext.jsx
├── components/
│   ├── auth/        ProtectedRoute.jsx
│   ├── chat/        ChatBubble.jsx, ChatContainer.jsx, ChatInput.jsx
│   ├── inventory/   MotorcycleCard.jsx, MotorcycleList.jsx
│   ├── layout/      Layout.jsx, Navbar.jsx
│   ├── shared/      EmptyState.jsx, ToastViewport.jsx
│   └── workshop/    CompactMechanicQueue.jsx, InvoiceModal.jsx,
│                    MechanicDashboard.jsx, MotorcycleCard.jsx, ReceptionForm.jsx
└── pages/
    AdminPage.jsx, ChatPage.jsx, HistoryPage.jsx, LoginPage.jsx,
    MechanicPage.jsx, ProfilePage.jsx, RegisterPage.jsx, WorkshopPage.jsx
```

---

## BFF (`bff/`)

El BFF (Backend For Frontend) es el único punto de entrada para el browser. Centraliza autenticación, sesiones y proxy hacia los servicios internos.

### Herramientas principales

| Herramienta | Versión | Propósito |
|---|---|---|
| **Express** | ^4.19 | Framework HTTP para Node.js. Maneja rutas, middleware y sesiones. |
| **express-session + connect-redis** | — | Sesiones server-side almacenadas en Redis. Cookie `httpOnly`, TTL 24h. |
| **undici** | — | Cliente HTTP de alto rendimiento para llamar a FastAPI desde Node. |
| **http-proxy-middleware** | ^3.x | Proxy HTTP hacia FastAPI. Inyecta el JWT de sesión en el header `Authorization`. |
| **ws** | ^8.21 | Proxy WebSocket hacia FastAPI. Bridge bidireccional con autenticación Redis. |
| **@supabase/supabase-js** | — | Cliente Supabase con `service_role` para operaciones privilegiadas. |
| **helmet + cors** | — | Seguridad HTTP básica y CORS configurado por `CORS_ORIGIN`. |
| **pino** | — | Logs estructurados en JSON. |

### Estructura de carpetas

```
bff/src/
├── config.js               ← valida env vars con Zod, falla rápido si falta alguna
├── server.js               ← Express, sesiones Redis, monta todas las rutas
├── middleware/
│   ├── requireAuth.js      ← verifica sesión + expiración JWT → 401 si inválida
│   └── rateLimiter.js      ← loginLimiter (5/15min), registerLimiter (3/hora)
├── routes/
│   ├── auth.routes.js      ← POST /auth/login, /register, /logout + GET /profile
│   ├── workshop.routes.js  ← 5 rutas de taller (requieren auth)
│   ├── history.routes.js   ← GET/DELETE /history (requieren auth)
│   └── proxy.routes.js     ← proxy HTTP hacia FastAPI /chat/*
├── services/
│   ├── authService.js      ← login/register/profile → llama a FastAPI
│   ├── workshopService.js  ← operaciones sobre ingresos_taller en Supabase
│   ├── historyService.js   ← historial de conversaciones en Supabase
│   └── supabaseClient.js   ← instancia del cliente Supabase
└── websocket/
    └── chatWsProxy.js      ← bridge WebSocket BFF ↔ FastAPI con auth Redis
```

### Endpoints expuestos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Login → crea sesión Redis |
| POST | `/auth/register` | Registro de usuario |
| POST | `/auth/logout` | Destruye sesión |
| GET | `/auth/profile` | Datos del usuario desde sesión |
| GET | `/workshop/motorcycles` | Lista de ingresos (admin/secretario) |
| GET | `/workshop/mechanic-queue` | Cola sin PII (mecánico) |
| POST | `/workshop/ingreso` | Crear nuevo ingreso |
| PUT | `/workshop/motorcycles/:id` | Actualizar estado |
| PUT | `/workshop/motorcycles/:id/complete` | Marcar como completada |
| GET | `/history` | Historial del usuario |
| DELETE | `/history/:id` | Eliminar entrada de historial |
| WS | `/api/chat/ws/:conversationId` | Chat streaming token a token |
| * | `/api/*` | Proxy HTTP hacia FastAPI |

---

## Backend IA (`backend/`)

### Herramientas principales

| Herramienta | Versión | Propósito |
|---|---|---|
| **FastAPI** | 0.115.0 | Framework async para APIs REST y WebSocket. Documentación OpenAPI en `/docs`. |
| **Uvicorn** | 0.30.0 | Servidor ASGI. Hot-reload en desarrollo. |
| **SQLAlchemy** | 2.0.x | ORM async para PostgreSQL (usuarios y conversaciones). |
| **asyncpg** | 0.29.0 | Driver PostgreSQL async nativo. Hasta 3x más rápido que psycopg2. |
| **python-jose** | 3.3.0 | Firma y verificación de JWT (HS256). |
| **passlib + bcrypt** | 1.7.4 | Hash de contraseñas. Bcrypt con sal automática. |
| **Pydantic v2** | 2.9.0 | Validación de datos. Motor Rust (pydantic-core), 5–50x más rápido que v1. |
| **AsyncOpenAI** | 1.51.x | Streaming token a token con `stream=True`. Cliente separado del síncrono. |
| **Qdrant Client** | 1.11.0 | Búsqueda semántica sobre embeddings de manuales técnicos. |
| **motor** | 3.6.0 | Driver MongoDB async. Historial de conversaciones. |
| **groq** | 0.11.0 | Transcripción de voz a texto con Whisper (opcional). |

### Flujo de datos — Chat con streaming

```
Browser (WebSocket)
  → BFF :3000/api/chat/ws/{conversationId}   (inyecta JWT desde sesión Redis)
  → FastAPI :8000/chat/ws/{conversationId}?token={jwt}
  → retrieve_context() en Qdrant
  → AsyncOpenAI stream=True
  → yield token por token → browser
  → al terminar: guarda mensaje completo en MongoDB
```

El endpoint POST `/chat/conversations/{id}/messages` se mantiene como fallback HTTP.

### Estructura de carpetas

```
backend/
├── auth/           ← login, register, JWT, roles
├── chat/
│   ├── router.py   ← endpoints REST + WebSocket /chat/ws/{id}
│   └── models/     ← SQLAlchemy (Conversation, Message)
├── rag/
│   ├── retrieval/  ← búsqueda semántica en Qdrant
│   └── generation/
│       └── generator.py  ← generate_answer_stream (AsyncOpenAI)
├── logs/           ← historial MongoDB + sesiones Redis
├── analytics/      ← estadísticas por rol (pendiente de implementar)
└── create_test_users.py   ← crea secretario y mecánico de prueba
    create_admin.py        ← crea usuario admin
```

---

## Infraestructura

| Servicio | Tecnología | Puerto | Propósito |
|---|---|---|---|
| Frontend | React + Vite / Nginx | 5173 | UI del taller |
| BFF | Express + Node | 3000 | Punto de entrada del browser |
| Backend IA | FastAPI + Uvicorn | 8000 | RAG, chat, auth JWT |
| Base de datos usuarios | PostgreSQL 16 | 5432 | Usuarios, conversaciones |
| Vector store | Qdrant | 6333 | Embeddings de manuales |
| Sesiones | Redis 7 | 6379 | Sesiones BFF + contexto activo |
| Historial | MongoDB 7 | 27017 | Logs de conversaciones |

### Cadena de arranque Docker

```
db + redis + qdrant + mongodb  →  backend  →  bff  →  web
```

Todos los servicios tienen healthcheck. El BFF no arranca hasta que `backend` esté healthy.

---

## Flujo de autenticación

```
1. Browser → POST /auth/login → BFF
2. BFF → POST /auth/login → FastAPI (valida credenciales)
3. FastAPI → { access_token, user } → BFF
4. BFF guarda { jwt, user } en sesión Redis
5. BFF setea cookie httpOnly en el browser
6. Browser → cualquier request → BFF (envía cookie automáticamente)
7. BFF lee JWT de sesión Redis → inyecta Authorization: Bearer en proxy a FastAPI
```

El browser nunca ve el JWT directamente.

---

## Pendientes conocidos

| Pendiente | Detalle |
|---|---|
| Rate limiting | `bff/src/middleware/rateLimiter.js` — deshabilitado en dev, habilitar en producción |
| `GET /auth/profile` en FastAPI | BFF lo sirve desde sesión por ahora |
| Analytics | `GET /analytics/me` y `/analytics/admin` no implementados en FastAPI |
| `logs_router` en FastAPI | `backend/logs/log_router.py` existe pero no está montado en `main.py` |
| `web/src/services/workshopService.js` | Llama directo a Supabase desde el browser — revisar si sigue en uso |
