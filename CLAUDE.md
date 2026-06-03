# MotorConnect — Guía de Claude

## Arquitectura final implementada

```
Browser (React + Vite, JS puro)
  │  HTTP REST + WebSocket
  ▼
BFF — Express + Node :3000
  │  Responsabilidades: auth, sesiones Redis, proxy HTTP+WS, rate limiting
  ├─► Supabase (datos del taller: ingresos, mecánicos, motos)
  └─► FastAPI :8000 (IA/RAG, chat, autenticación JWT)
        └─► OpenAI (LLM streaming + embeddings)
        └─► Qdrant (vector search)
        └─► MongoDB (historial de conversaciones)
        └─► PostgreSQL local (usuarios)
```

## Stack y versiones clave

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + Vite | 18 / 5.4 |
| BFF | Express + Node | 4.19 / 20 LTS |
| Sesiones | connect-redis + Redis | 7.1 / 7 |
| Proxy WS | ws | 8.21 |
| Backend IA | FastAPI + Uvicorn | — |
| LLM | OpenAI gpt-4o-mini | — |
| DB negocio | Supabase (PostgreSQL) | — |
| DB usuarios | PostgreSQL local | 15 |
| Logs chat | MongoDB | 7 |
| Vector search | Qdrant | — |

## Cómo levantar el proyecto

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Editar .env con las claves reales (Supabase, OpenAI, etc.)

# 2. Levantar todos los servicios
docker compose up

# 3. (Primera vez) Crear usuarios de prueba
docker compose exec db psql -U motorconnect -d motorconnect_db -c "
  ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'secretario';
  ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'mecanico';
"
docker compose exec backend python create_test_users.py

# 4. Frontend en desarrollo (opcional — ya incluido en docker compose)
cd web && npm run dev
```

## Credenciales de prueba

| Rol | Email | Password |
|---|---|---|
| admin | admin@pegasus.com | *(ver .env)* |
| secretario | secretario@pegasus.com | TallerPassword123! |
| mecanico | mecanico@pegasus.com | TallerPassword123! |

## Puertos

| Servicio | Puerto |
|---|---|
| Frontend (Vite) | 5174 (o 5173) |
| BFF (Express) | 3000 |
| Backend (FastAPI) | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MongoDB | 27017 |
| Qdrant | 6333 |

## Pendientes conocidos

| Pendiente | Detalle |
|---|---|
| Rate limiting deshabilitado | `bff/src/middleware/rateLimiter.js` — reactivar en producción |
| `GET /auth/profile` en FastAPI | BFF lo sirve desde sesión por ahora |
| Analytics | `GET /analytics/me` y `/analytics/admin` no implementados en FastAPI |
| `motorcycles` y `motorcycles_completed` | Tablas legacy en Supabase — deprecar cuando `ingresos_taller` las reemplace |
| `web/src/services/workshopService.js` | Servicio frontend que llama directo a Supabase — revisar si sigue en uso |

## Rama de trabajo

`feature/migration-js-bff` (desde `main`)

---

## Fase 0 — Preparación (completada)

**Rama activa:** `feature/migration-js-bff`

### Archivos creados (sin tocar `web/`)

```
bff/
├── .env.example          ← 7 variables documentadas
├── package.json          ← 11 dependencias, type: "module" (ESM)
└── src/
    ├── config.js         ← valida env vars con Zod, falla rápido si falta alguna
    ├── server.js         ← Express + helmet + cors + pino + GET /health
    ├── routes/           ← vacío (placeholder)
    ├── middleware/        ← vacío (placeholder)
    └── services/         ← vacío (placeholder)
```

### `docker-compose.yaml` modificado

Se agregó el servicio `bff` entre `backend` y `web`:
- Imagen `node:20-alpine`, puerto `3000`
- Depende de `redis` y `backend`
- Monta `./bff:/app` (hot-reload en dev con `--watch`)

---

## Fase 1 — BFF Auth (completada)

### Archivos creados / modificados

```
bff/
├── package.json                  ← +redis ^4.7.0 (cliente requerido por connect-redis)
└── src/
    ├── server.js                 ← sesiones Redis (express-session + RedisStore) + rutas /auth montadas
    ├── services/
    │   └── authService.js        ← login() / register() / getProfile() → llaman a FastAPI con undici
    ├── middleware/
    │   └── requireAuth.js        ← verifica req.session.jwt → 401 si no existe, pone req.jwt y llama next()
    └── routes/
        └── auth.routes.js        ← POST /auth/login, /auth/register, /auth/logout + GET /auth/profile
```

### Decisiones y hallazgos

- **FastAPI no tiene `/auth/profile`**: solo expone `/auth/login` y `/auth/register`.
  El BFF guarda el objeto `user` completo en sesión durante el login.
  `GET /auth/profile` sirve `req.session.user` directamente sin llamar a FastAPI.
  `authService.getProfile()` existe y llamará a FastAPI cuando ese endpoint se agregue.
- **Sesión**: cookie `httpOnly`, `secure` solo en producción, TTL 24 h, almacenada en Redis.
- **Validación de entrada**: checks mínimos en el router (campos requeridos) antes de llamar al servicio.

### Contrato FastAPI confirmado

| Endpoint | Body | Respuesta |
|---|---|---|
| `POST /auth/login` | `{ email, password }` | `{ access_token, token_type, user: { id, email, name, role, created_at } }` |
| `POST /auth/register` | `{ nombre, email, password, accept_terms, empresa_taller? }` | `{ id, nombre, email, rol, empresa_taller?, created_at }` |

### Pruebas curl

```bash
# Login
curl -c cookies.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"TuPass1"}' | jq

# Profile (requiere cookie de sesión)
curl -b cookies.txt http://localhost:3000/auth/profile | jq

# Logout
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/auth/logout | jq

# Levantar solo BFF + dependencias
docker compose up redis backend bff
```

---

## Ajustes post-Fase 1 — Docker & .env (completados)

### `.env` corregido
Todos los encabezados de sección (`=== X ===`) y texto libre carecían de `#`.
Docker Compose los interpretaba como nombres de variable inválidos.
Corregidos todos a comentarios `# === X ===`. Agregado `SESSION_SECRET` para el BFF.

### `docker-compose.yaml` — healthchecks y conditions

| Servicio | Healthcheck | Condición usada por |
|---|---|---|
| `db` | `pg_isready` | `backend` (`service_healthy`) |
| `redis` | `redis-cli ping` — interval 5s, timeout 3s, retries 5 | `backend` (`service_healthy`), `bff` (`service_healthy`) |
| `qdrant` | `wget /health` — interval 10s, timeout 5s, retries 5 | `backend` (`service_healthy`) |
| `mongodb` | `mongosh --eval db.adminCommand('ping')` — interval 10s, timeout 5s, retries 5 | `backend` (`service_healthy`) |
| `backend` | `wget /health` — interval 10s, timeout 5s, retries 10 | `bff` (`service_healthy`) |
| `bff` | `wget /health` — interval 10s, timeout 5s, retries 5 | — |

Chain de arranque garantizado: `db` + `redis` + `qdrant` + `mongodb` → `backend` → `bff`.

`backend/main.py` ya tenía `GET /health` en línea 86 — no requirió cambios.

---

## Fase 2 — BFF Servicios (completada)

### Archivos creados / modificados

```
bff/src/
├── services/
│   ├── supabaseClient.js   ← createClient con SUPABASE_URL + SUPABASE_SERVICE_KEY
│   ├── workshopService.js  ← getMotorcycles / getMechanicQueue / createIngreso /
│   │                          updateMotorcycleStatus / completarMoto → Supabase
│   └── historyService.js   ← getHistory(userId) / deleteHistory(id) → Supabase
└── routes/
    ├── workshop.routes.js  ← 5 rutas protegidas con requireAuth
    ├── history.routes.js   ← 2 rutas protegidas con requireAuth
    └── (auth.routes.js)    ← sin cambios
bff/src/server.js           ← monta /workshop y /history
```

### Tablas y vistas de Supabase usadas

| Servicio | Tabla / Vista | Notas |
|---|---|---|
| `getMotorcycles` | `ingresos_taller` | Vista completa (admin/secretario) |
| `getMechanicQueue` | `vista_mecanicos_ingresos` | Sin PII (solo id, marca_modelo, placa, observaciones) |
| `createIngreso` | `ingresos_taller` | INSERT |
| `updateMotorcycleStatus` | `ingresos_taller` | **Requiere columna `estado VARCHAR(50)`** (Camino 1 del schema) |
| `completarMoto` | `ingresos_taller` | Llama `updateMotorcycleStatus(id, 'completada')` |
| `getHistory` / `deleteHistory` | `historial` | **Tabla pendiente de crear en Supabase** |

### Pendientes de schema en Supabase

```sql
-- Para updateMotorcycleStatus y completarMoto:
ALTER TABLE ingresos_taller ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'en_cola';
ALTER TABLE ingresos_taller ADD COLUMN IF NOT EXISTS mecanico_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;

-- Para historyService:
CREATE TABLE IF NOT EXISTS historial (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    -- agregar columnas de contenido según el caso de uso
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE historial DISABLE ROW LEVEL SECURITY;
```

### Endpoints expuestos

| Método | Ruta | Auth | Servicio |
|---|---|---|---|
| GET | `/workshop/motorcycles` | ✓ | `getMotorcycles` |
| GET | `/workshop/mechanic-queue` | ✓ | `getMechanicQueue` |
| POST | `/workshop/ingreso` | ✓ | `createIngreso` |
| PUT | `/workshop/motorcycles/:id` | ✓ | `updateMotorcycleStatus` |
| PUT | `/workshop/motorcycles/:id/complete` | ✓ | `completarMoto` |
| GET | `/history` | ✓ | `getHistory(session.user.id)` |
| DELETE | `/history/:id` | ✓ | `deleteHistory` |

---

## Fase 3 — Migración TypeScript → JavaScript en el frontend (completada)

### Objetivo

Convertir `web/` de TypeScript a JavaScript puro (React + Vite), eliminando todos los tipos sin cambiar ninguna lógica.

### Archivos eliminados

| Archivo | Motivo |
|---|---|
| `web/tsconfig.json`, `web/tsconfig.node.json` | Configuración TS ya no necesaria |
| `web/src/vite-env.d.ts` | Declaración de tipos de Vite |
| `web/src/types/index.ts` | Todas las interfaces y tipos centralizados |
| 37 archivos `.tsx` / `.ts` en `web/src/` | Reemplazados por `.jsx` / `.js` equivalentes |

### Paquetes eliminados de `devDependencies`

- `typescript`
- `@types/node`, `@types/react`, `@types/react-dom`
- `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`

### Cambios en archivos de configuración

| Archivo | Cambio |
|---|---|
| `web/package.json` | Scripts `lint` y `format` actualizados a `js,jsx`; 5 devDependencies eliminadas |
| `web/vite.config.ts` → `vite.config.js` | Alias `@types` eliminado (carpeta borrada); sin otros cambios |
| `web/index.html` | Entry point actualizado: `main.tsx` → `main.jsx` |

### Construcciones de TypeScript eliminadas del código

| Construcción | Ejemplo original | JS resultante |
|---|---|---|
| Interfaces y types | `interface AuthState { ... }` | Eliminado |
| Importaciones de tipo | `import type { User } from '@types'` | Eliminado |
| Genéricos en hooks | `useState<string \| null>(null)` | `useState(null)` |
| Genéricos en refs | `useRef<HTMLDivElement>(null)` | `useRef(null)` |
| Genéricos en stores | `create<ToastState>(...)` | `create(...)` |
| Anotaciones de parámetros | `(e: React.FormEvent)` | `(e)` |
| Anotaciones de retorno | `function f(): string` | `function f()` |
| Type assertions | `value as Type`, `{} as T` | `value`, `{}` |
| Non-null assertions | `element!` | `element` |
| `type` alias de Zod | `type Form = z.infer<typeof schema>` | Eliminado (schema y lógica Zod intactos) |

### Zod — mantenido

Todas las validaciones Zod (`receptionSchema`, `loginSchema`, `registerSchema`) se conservan íntegras porque son validación en runtime, no TypeScript.

### Resultado

```
cd web && npm run dev
→ VITE v5.4.21  ready in 790 ms  ✓ (sin errores)
```

### Estructura final de web/src/

```
web/src/
├── main.jsx
├── App.jsx
├── index.css
├── lib/          fetch.js, supabase.js
├── utils/        dates.js
├── store/        authStore.js, toastStore.js
├── services/     api.js, supabaseAuthService.js, workshopService.js
├── hooks/        useAuth.js, useChat.js, useChatUI.js, useWorkshop.js
├── contexts/     ChatContext.jsx, WorkshopContext.jsx
├── components/
│   ├── auth/     ProtectedRoute.jsx
│   ├── chat/     ChatBubble.jsx, ChatContainer.jsx, ChatInput.jsx
│   ├── inventory/ MotorcycleCard.jsx, MotorcycleList.jsx
│   ├── layout/   Layout.jsx, Navbar.jsx
│   ├── shared/   EmptyState.jsx, ToastViewport.jsx
│   └── workshop/ CompactMechanicQueue.jsx, InvoiceModal.jsx,
│                 MechanicDashboard.jsx, MotorcycleCard.jsx, ReceptionForm.jsx
└── pages/
    AdminPage.jsx, ChatPage.jsx, HistoryPage.jsx, LoginPage.jsx,
    MechanicPage.jsx, ProfilePage.jsx, RegisterPage.jsx, WorkshopPage.jsx
```

---

## Fixes post-Fase 3 — Integración BFF ↔ Frontend (completados)

### Problema raíz: body vacío en el proxy

`express.json()` consume el stream del body antes de que `http-proxy-middleware` lo reenvíe a FastAPI. El POST llegaba con `Content-Length: 2` (`{}`).

**Fix:** importar y llamar `fixRequestBody(proxyReq, req)` dentro de `on.proxyReq` en `bff/src/routes/proxy.routes.js`.

### Problema raíz: API de http-proxy-middleware v3

`http-proxy-middleware` instalado es **v3.0.5**. En v3 los callbacks cambiaron de nombre:

| v2 (roto) | v3 (correcto) |
|---|---|
| `onProxyReq: fn` | `on: { proxyReq: fn }` |
| `onProxyRes: fn` | `on: { proxyRes: fn }` |
| `onError: fn` | `on: { error: fn }` |

El callback `onProxyReq` se ignoraba silenciosamente → el header `Authorization: Bearer` nunca llegaba a FastAPI → 403 en todos los endpoints de chat.

**Fix aplicado en `bff/src/routes/proxy.routes.js`:**

```js
on: {
  proxyReq: (proxyReq, req) => {
    if (req.session?.jwt) {
      proxyReq.setHeader('Authorization', `Bearer ${req.session.jwt}`)
    }
    fixRequestBody(proxyReq, req)
  },
},
```

### Problema raíz: CORS_ORIGIN faltante en `.env`

`CORS_ORIGIN` no existía en `.env` → el BFF usaba el fallback hardcodeado `http://localhost:5173`. Vite sube al puerto `5174` cuando el `5173` está ocupado, causando que el browser bloqueara las cookies de sesión.

**Fix:** agregado `CORS_ORIGIN=http://localhost:5174` en `.env` (línea 33). Además `bff/src/server.js` ahora acepta `5173` y `5174` explícitamente para tolerar cambios de puerto de Vite en dev.

### Problema raíz: isPending stuck en React Query

`useSendMessage` y `useCreateConversation` carecían de `onSettled` y `retry: 0`. Un `NS_BINDING_ABORTED` (abort de red antes de los 120s) dejaba `isPending = true` indefinidamente, bloqueando todos los envíos posteriores.

**Fix en `web/src/hooks/useChat.js`:**
- `retry: 0` explícito en ambas mutaciones
- `onSettled` en `useSendMessage`: invalida `['messages', conversationId]` solo si `data` existe (éxito), para no generar loop de refetch en error
- `onSettled` en `useCreateConversation`: invalida `['conversations']` siempre

### Timeout de sendMessage extendido

`apiFetch` tiene timeout default de 15s. El pipeline RAG + LLM de FastAPI supera ese límite.

**Fix en `web/src/services/api.js`:** `sendMessage` pasa `timeout: 120_000` (2 min). El resto de endpoints mantienen los 15s.

### Schema de Supabase — tablas creadas

Las tablas y columnas pendientes de Fase 2 fueron creadas:

| Objeto | Estado |
|---|---|
| Tabla `usuarios` | ✓ creada |
| Tabla `ingresos_taller` | ✓ creada |
| Columna `ingresos_taller.estado VARCHAR(50)` | ✓ agregada |
| Columna `ingresos_taller.mecanico_id` | ✓ agregada |
| Columna `ingresos_taller.celular` | ✓ agregada |
| Vista `vista_mecanicos_ingresos` | ✓ creada |

### Estado funcional actual

- Login / logout / sesión Redis: funcionando
- Cola del mecánico (`/workshop/mechanic-queue`): funcionando
- Chat end-to-end (frontend → BFF → FastAPI RAG): funcionando

---

## Fase 4 — WebSockets para streaming del chat (completada)

### Arquitectura implementada

```
Browser (WebSocket)
  → BFF :3000/api/chat/ws/{conversationId}   (proxy con auth)
  → FastAPI :8000/chat/ws/{conversationId}?token={jwt}
  → AsyncOpenAI stream=True
  → yield token por token → browser
```

### Archivos creados / modificados

```
backend/rag/generation/generator.py   ← generate_answer_stream (AsyncOpenAI + stream=True)
backend/chat/router.py                ← @router.websocket("/ws/{conversation_id}")
bff/src/websocket/chatWsProxy.js      ← nuevo — bridge bidireccional con auth Redis
bff/src/server.js                     ← export const server + setupChatWsProxy(server, redisClient)
web/src/hooks/useChatWebSocket.js     ← nuevo — hook con reconexión y fallback
web/src/components/chat/ChatContainer.jsx  ← reemplaza useSendMessage por useChatWebSocket
```

### FastAPI — generator.py

- `generate_answer_stream` es un `AsyncGenerator` que usa `AsyncOpenAI` (cliente separado del síncrono)
- `stream=True` en `chat.completions.create` → yield por cada delta de token
- `yield None` como señal de fin de stream
- `generate_answer` síncrono intacto para el POST de compatibilidad

### FastAPI — router.py (`/chat/ws/{conversation_id}`)

- JWT llega como query param `?token=` (el browser no puede enviar headers en el handshake WS)
- Verifica JWT y ownership de conversación **antes** de `websocket.accept()`
- `retrieve_context` wrapped en `asyncio.to_thread` para no bloquear el event loop
- Loop: `receive_json()` → retrieval → streaming → guardar mensaje completo → `send_json({type:"done"})`
- Tipos manejados: `message` (implementado), `audio` / `image` (retornan `not implemented yet`)
- POST `/chat/conversations/{id}/messages` intacto como fallback

### BFF — chatWsProxy.js

- Escucha `server.on('upgrade')` — intercepta handshakes WS antes de Express
- Lee `connect.sid` de las cookies del upgrade request
- Busca `sess:{sessionId}` en Redis → extrae JWT (reutiliza `redisClient` existente)
- Conecta a FastAPI con `ws://backend:8000/chat/ws/{id}?token={jwt}`
- Buffer de mensajes del browser mientras el backend WS no está listo (evita pérdida de mensajes)
- Convierte frames de Buffer a string (`data.toString()`) antes de reenviar a FastAPI — FastAPI requiere frames de texto para `receive_json()`

### Frontend — useChatWebSocket.js

- Conecta a `ws://localhost:3000/api/chat/ws/{conversationId}` (cookie enviada automáticamente)
- `onmessage` usa `parseWsMessage()` que maneja Blob, ArrayBuffer y string
- `type: token` → acumula en `streamingText`; `type: done` → invalida query de mensajes; `type: error` → limpia estado
- Reconexión automática hasta 3 intentos (2s de delay), solo en cierres no limpios (`code !== 1000`)
- `sendMessage(content)` retorna `false` si el socket no está abierto

### Frontend — ChatContainer.jsx

- `streamingText` e `isStreaming` ahora vienen de `useChatWebSocket` (eliminados del estado local)
- `doSend`: usa WebSocket si `isConnected && !usePostFallback`, si no cae al POST mutation
- Fallback automático a POST si WebSocket no conecta en 3 segundos
- El cursor `▋` y el `ChatBubble` de streaming ya existían en la UI — ahora reciben datos reales

### Bugs encontrados y resueltos durante la implementación

| Bug | Causa | Fix |
|---|---|---|
| `KeyError: 'text'` en FastAPI | Node.js reenvía Buffer como frame binario | `data.toString()` antes de `backendWs.send()` |
| Tokens no aparecen en UI | `event.data` llega como `Blob` en Firefox | `parseWsMessage()` con `instanceof Blob` + `.text()` |
| `onProxyReq` silencioso | http-proxy-middleware v3 cambió API | `on: { proxyReq: fn }` |

### Estado funcional

- Chat con streaming token a token: **funcionando**
- Cursor `▋` animado mientras el LLM responde: **funcionando**
- Fallback a POST si WS falla: **funcionando**
- Reconexión automática: **funcionando** (máx 3 intentos)

---

## Fase 5 — Hardening (completada)

### Cambios aplicados

| Archivo | Cambio |
|---|---|
| `bff/src/middleware/rateLimiter.js` | `loginLimiter` (5/15min) + `registerLimiter` (3/hora) — **deshabilitados temporalmente** en dev, habilitar en producción |
| `bff/src/routes/auth.routes.js` | Limiters como middleware en `/login` y `/register` |
| `bff/src/middleware/requireAuth.js` | Valida expiración JWT: decodifica `exp` en base64url sin librería — destruye sesión y retorna 401 si expirado |
| `bff/src/server.js` | `express.json({ limit: '10mb' })` + error handler global (oculta stack en producción) |
| `bff/src/websocket/chatWsProxy.js` | Máx 5 conexiones WS simultáneas por IP via `connectionsByIp` Map |
| `web/src/hooks/useChatWebSocket.js` | `onError` callback — errores WS y de servidor se propagan al componente |
| `web/src/components/chat/ChatContainer.jsx` | `addToast('error', msg)` en el `onError` del hook |
| `web/src/lib/fetch.js` | Cadena de error: `detail \|\| message \|\| error \|\| fallback` — cubre respuestas `{ error: '...' }` del BFF |
| `web/src/store/toastStore.js` | Máximo 3 toasts simultáneos (`slice(-2)` antes de agregar) |
| `web/src/hooks/useAuth.js` | `onError` de login eliminado — errores de auth se muestran inline, no como toast |

---

## Usuarios de prueba — base de datos local

Script: `backend/create_test_users.py`

```bash
# Requiere que los valores del enum existan en PostgreSQL:
docker compose exec db psql -U motorconnect -d motorconnect_db -c "
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'secretario';
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'mecanico';
"

docker compose exec backend python create_test_users.py
```

| id | email | rol | password |
|---|---|---|---|
| 4 | admin@pegasus.com | admin | *(ver .env o gestor de contraseñas)* |
| 5 | secretario@pegasus.com | secretario | TallerPassword123! |
| 6 | mecanico@pegasus.com | mecanico | TallerPassword123! |

**Nota:** El enum `userrole` en PostgreSQL solo tenía `employee` y `admin`. Se agregaron `secretario` y `mecanico` con `ALTER TYPE ... ADD VALUE IF NOT EXISTS`.
