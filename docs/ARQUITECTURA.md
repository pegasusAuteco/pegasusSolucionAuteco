# MotorConnect — Arquitectura del sistema

**Versión:** 2.0 | **Fecha:** 2026-06-02

---

## 1. Resumen ejecutivo

MotorConnect es una plataforma web para talleres de motocicletas Auteco Mobility. Centraliza tres funciones principales:

- **Recepción de motos:** registro digital de ingresos al taller, asignación a mecánicos y seguimiento de estado.
- **Panel del mecánico:** cola de trabajo filtrada sin datos PII del cliente, actualización de estado en tiempo real.
- **Asistente técnico IA (Pegasus):** chatbot con streaming que responde preguntas sobre manuales técnicos usando RAG (Retrieval-Augmented Generation) sobre los manuales oficiales de Auteco.

La versión 2.0 migró el frontend de TypeScript a JavaScript puro, introdujo un BFF (Backend For Frontend) en Node.js/Express para centralizar la autenticación, y reemplazó el chat síncrono por WebSocket con streaming token a token.

---

## 2. Stack tecnológico

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 18 | UI declarativa |
| Vite | 5.4 | Build tool + dev server |
| Zustand | — | Estado global (auth, toasts) |
| TanStack Query | — | Cache de datos remotos, mutations |
| React Router | — | Navegación SPA |
| Tailwind CSS | — | Estilos utilitarios |
| Zod | — | Validación de formularios en runtime |
| Lucide React | — | Iconografía |

### BFF (Backend For Frontend)
| Tecnología | Versión | Rol |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Express | 4.19 | Framework HTTP |
| express-session | 1.18 | Gestión de sesiones |
| connect-redis | 7.1 | Store de sesiones en Redis |
| ws | 8.21 | Servidor WebSocket (proxy) |
| http-proxy-middleware | 3.0 | Proxy HTTP hacia FastAPI |
| helmet | 7.1 | Headers de seguridad HTTP |
| pino | 9 | Logging estructurado |
| express-rate-limit | 8.5 | Rate limiting (preparado, deshabilitado en dev) |

### Backend IA
| Tecnología | Versión | Rol |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | — | Framework HTTP + WebSocket |
| Uvicorn | — | Servidor ASGI |
| SQLAlchemy (async) | — | ORM PostgreSQL |
| OpenAI SDK | — | LLM (gpt-4o-mini) + embeddings |
| Motor | — | Cliente MongoDB async |
| Passlib + bcrypt | — | Hashing de contraseñas |
| python-jose | — | Generación y validación de JWT |

### Bases de datos
| Sistema | Uso |
|---|---|
| PostgreSQL (local) | Usuarios y autenticación |
| Supabase (PostgreSQL) | Datos del taller: ingresos, motos, mecánicos |
| MongoDB | Historial de conversaciones del chat |
| Redis | Sesiones del BFF |
| Qdrant | Vectores de embeddings para RAG |

---

## 3. Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER  (React + Vite, puerto 5174)                        │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ LoginPage│  │ WorkshopPage │  │ ChatPage (WebSocket) │   │
│  └──────────┘  └──────────────┘  └─────────────────────┘   │
└──────────────────────┬──────────────────────┬───────────────┘
                       │ HTTP REST             │ WebSocket
                       ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BFF — Express/Node  (puerto 3000)                           │
│                                                              │
│  /api/auth/*     → authRoutes   (login, register, logout)   │
│  /api/workshop/* → workshopRoutes → Supabase                │
│  /api/history/*  → historyRoutes  → Supabase                │
│  /api/chat/ws/*  → chatWsProxy    (upgrade handler)         │
│  /api/*          → proxyRoutes    → FastAPI (HTTP)          │
│                                                              │
│  Seguridad: helmet · cors · express-session/Redis           │
│             requireAuth · rate limiting (prep.)             │
└──────────────────────┬──────────────────────┬───────────────┘
                       │ HTTP                  │ WebSocket
                       ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│  FASTAPI — Python  (puerto 8000)                             │
│                                                              │
│  POST /auth/login|register   → JWT                          │
│  GET  /chat/conversations/*  → MongoDB                      │
│  POST /chat/conversations/*/messages → RAG pipeline         │
│  WS   /chat/ws/{id}?token=* → streaming pipeline            │
│                                                              │
│  RAG pipeline:                                               │
│    retrieve_context() → Qdrant (vector search)              │
│    generate_answer_stream() → OpenAI (stream=True)          │
└────┬──────────┬──────────┬──────────────────────────────────┘
     │          │          │
     ▼          ▼          ▼
┌────────┐ ┌───────┐ ┌──────────┐ ┌──────────┐
│Postgres│ │Mongo  │ │  Qdrant  │ │ Supabase │
│(local) │ │(logs) │ │(vectors) │ │(taller)  │
└────────┘ └───────┘ └──────────┘ └──────────┘
               ▲
         ┌─────┘
         │ Redis (sesiones BFF)
```

---

## 4. Descripción de cada capa

### 4.1 Frontend — React + Vite (JS puro)

El frontend es una SPA sin TypeScript. Usa Vite como dev server y bundler.

**Estado global:**
- `authStore` (Zustand): usuario autenticado, acción de logout
- `toastStore` (Zustand): cola de notificaciones (máx 3 simultáneos)

**Caché de datos remotos:**
- TanStack Query gestiona las queries de conversaciones y mensajes
- Las mutations (`useSendMessage`, `useCreateConversation`) tienen `retry: 0` y `onSettled` para evitar estados stuck

**Componentes principales:**

| Componente | Función |
|---|---|
| `ChatContainer.jsx` | Interfaz de chat con streaming WebSocket + fallback POST |
| `ReceptionForm.jsx` | Formulario de ingreso de moto (validación Zod) |
| `MechanicDashboard.jsx` | Panel del mecánico con cola de trabajo |
| `CompactMechanicQueue.jsx` | Vista compacta de la cola para sidebar |
| `Layout.jsx` + `Navbar.jsx` | Shell de la aplicación |
| `ProtectedRoute.jsx` | Guard de rutas por rol |
| `ToastViewport.jsx` | Sistema de notificaciones |

**Comunicación con el servidor:**
- `apiFetch()` en `lib/fetch.js`: wrapper sobre `fetch` con timeout configurable (default 15s, chat 120s), manejo de errores normalizado, redirect a login en 401
- `useChatWebSocket.js`: hook que gestiona la conexión WS, parseo de Blobs, reconexión automática (máx 3 intentos), y callback `onError`

### 4.2 BFF — Express + Node

El BFF es el único punto de entrada desde el browser. Centraliza:

1. **Autenticación con sesiones**: el JWT de FastAPI se guarda en Redis (no en localStorage). El browser solo recibe una cookie `httpOnly`. Esto elimina el riesgo de XSS robando tokens.

2. **Proxy HTTP hacia FastAPI**: `http-proxy-middleware` v3 reenvía todas las requests de `/api/*` con el `Authorization: Bearer` inyectado desde la sesión. `fixRequestBody()` reinyecta el body JSON que `express.json()` ya consumió.

3. **Proxy WebSocket**: el handler `server.on('upgrade')` intercepta el handshake WS, lee la sesión de Redis para extraer el JWT, y establece un bridge bidireccional hacia FastAPI con cola de mensajes.

4. **Rutas directas a Supabase**: workshop e historial llaman al SDK de Supabase directamente desde el BFF, sin pasar por FastAPI.

**Rutas expuestas:**

| Método | Ruta | Auth | Destino |
|---|---|---|---|
| POST | `/api/auth/login` | No | FastAPI → sesión Redis |
| POST | `/api/auth/register` | No | FastAPI |
| POST | `/api/auth/logout` | No | Destruye sesión |
| GET | `/api/auth/profile` | Sí | Sesión Redis |
| GET | `/api/workshop/motorcycles` | Sí | Supabase |
| GET | `/api/workshop/mechanic-queue` | Sí | Supabase (vista) |
| POST | `/api/workshop/ingreso` | Sí | Supabase |
| PUT | `/api/workshop/motorcycles/:id` | Sí | Supabase |
| GET/DELETE | `/api/history/*` | Sí | Supabase |
| WS | `/api/chat/ws/:id` | Sesión cookie | FastAPI WS |
| * | `/api/*` | Sí | FastAPI (proxy) |

### 4.3 Backend IA — FastAPI + Python

FastAPI maneja exclusivamente la lógica de IA y autenticación:

**Autenticación:** genera y valida JWT con `python-jose`. La tabla `usuarios` vive en PostgreSQL local con bcrypt para password hashing.

**Pipeline RAG:**
1. `retrieve_context(query)` — búsqueda por similitud coseno en Qdrant sobre embeddings de manuales técnicos
2. `generate_answer_stream(query, chunks, history)` — construye el prompt con el contexto recuperado y llama a OpenAI con `stream=True` via `AsyncOpenAI`
3. Cada token delta se envía via WebSocket inmediatamente (`send_json({type: "token", content: delta})`)
4. Al finalizar, guarda el mensaje completo en MongoDB y envía `{type: "done"}`

**WebSocket (`/chat/ws/{conversation_id}`):** el JWT llega como query param `?token=` (el browser no puede enviar headers en el handshake WS). La conversación se verifica antes de `accept()`. `retrieve_context` se ejecuta en `asyncio.to_thread()` para no bloquear el event loop de asyncio.

### 4.4 Bases de datos

**PostgreSQL local** — usuarios y autenticación. Gestionado por SQLAlchemy async. El enum `userrole` tiene cuatro valores: `employee`, `admin`, `mecanico`, `secretario`.

**Supabase (PostgreSQL)** — datos del negocio. Acceso directo via `@supabase/supabase-js` desde el BFF con `service_role` key. RLS deshabilitado en todas las tablas. Tablas principales: `usuarios`, `ingresos_taller`, `motorcycles`, `parts`, `manuales_chunks`, `fallas_diagnostico`.

**MongoDB** — historial de conversaciones. Colección `conversations` con los mensajes de cada sesión de chat. Consultado por FastAPI para pasar el historial reciente al LLM como contexto.

**Redis** — sesiones del BFF. Cada sesión guarda `{ jwt, user, cookie }`. TTL de 24 horas. El proxy WebSocket lee el JWT directamente de Redis sin pasar por Express.

**Qdrant** — base de vectores para RAG. Almacena embeddings de chunks de manuales técnicos de Auteco. La búsqueda por similitud coseno devuelve los `k` fragmentos más relevantes para cada consulta.

---

## 5. Flujos principales

### 5.1 Flujo de autenticación

```
Browser                    BFF                      FastAPI              Redis
   │                        │                          │                   │
   │── POST /api/auth/login ─►                         │                   │
   │   { email, password }  │── POST /auth/login ─────►│                   │
   │                        │                          │                   │
   │                        │◄── { access_token, user }│                   │
   │                        │                          │                   │
   │                        │── SET sess:{id} ─────────────────────────────►
   │                        │   { jwt, user }          │                   │
   │◄── 200 { user } ───────│                          │                   │
   │    Set-Cookie: connect.sid                        │                   │
   │                        │                          │                   │
   │── GET /api/chat/... ───►                          │                   │
   │   Cookie: connect.sid  │── GET sess:{id} ─────────────────────────────►
   │                        │◄── { jwt, user } ─────────────────────────────
   │                        │── GET /chat/... ─────────►
   │                        │   Authorization: Bearer {jwt}
   │◄── respuesta ──────────│◄── respuesta ────────────│
```

### 5.2 Flujo de chat con streaming WebSocket

```
Browser                    BFF                      FastAPI           OpenAI
   │                        │                          │                 │
   │── WS upgrade ──────────►                          │                 │
   │   /api/chat/ws/{id}    │  Lee sess:{id} → JWT     │                 │
   │   Cookie: connect.sid  │── WS connect ────────────►                 │
   │                        │   /chat/ws/{id}?token=JWT│                 │
   │◄── WS connected ───────│◄── WS accepted ──────────│                 │
   │                        │                          │                 │
   │── {type:"message",     │                          │                 │
   │    content:"..."} ─────►── forward ───────────────►                 │
   │                        │                          │ retrieve_context│
   │                        │                          │── Qdrant search ►
   │                        │                          │◄── chunks ───────
   │                        │                          │── stream=True ──►
   │                        │                          │◄── token ────────
   │◄── {type:"token"} ─────◄── forward ───────────────◄                 │
   │◄── {type:"token"} ─────◄──  ...                   │◄── token ────────
   │◄── {type:"done"} ──────◄── forward ───────────────◄── [DONE] ───────
```

### 5.3 Flujo de ingreso de moto al taller

```
Browser (Secretario)       BFF                      Supabase
   │                        │                          │
   │── POST /api/workshop/  │                          │
   │   ingreso ─────────────►                          │
   │   { cliente, placa,    │── INSERT ingresos_taller ►
   │     marca_modelo, ... }│   estado = 'en_cola'     │
   │                        │◄── { id, ... } ──────────│
   │◄── 201 { ingreso } ────│                          │
   │                        │                          │
   │ (Panel del mecánico)   │                          │
   │── GET /api/workshop/   │                          │
   │   mechanic-queue ──────►                          │
   │                        │── SELECT vista_mecani… ──►
   │                        │   cos_ingresos           │
   │◄── [{ id, marca_modelo,│◄── rows ─────────────────│
   │      placa, estado }]──│   (sin PII)              │
   │                        │                          │
   │── PUT /api/workshop/   │                          │
   │   motorcycles/:id ─────►                          │
   │   { estado:"completada"}── UPDATE ingresos_taller ►
   │◄── 200 ────────────────│◄── ok ───────────────────│
```

---

## 6. Decisiones técnicas importantes

### BFF con sesiones en Redis en lugar de JWT en localStorage

**Por qué:** almacenar el JWT en localStorage expone el token a ataques XSS. Con sesiones en Redis y cookie `httpOnly`, el JavaScript del browser nunca puede leer el token. El BFF inyecta el `Authorization` header en cada request hacia FastAPI de forma transparente.

**Tradeoff:** añade complejidad operacional (Redis como dependencia) y una latencia extra de ~1ms por lookup en Redis para WebSocket.

### WebSocket en el BFF como proxy con bridge manual en lugar de pass-through

**Por qué:** `http-proxy-middleware` v3 no soporta inyectar headers en el handshake WS. El bridge manual (`server.on('upgrade')` + `ws.WebSocketServer`) permite leer la sesión de Redis y pasar el JWT como query param hacia FastAPI, que es la única forma soportada por el browser para autenticación en WS.

**Tradeoff:** el bridge bidireccional añade una copia extra de cada frame en memoria del BFF.

### AsyncOpenAI con stream=True en lugar de esperar la respuesta completa

**Por qué:** el pipeline RAG (retrieval + LLM) tarda entre 5 y 30 segundos según la complejidad. Mostrar tokens en tiempo real reduce la latencia percibida a menos de 1 segundo en la mayoría de consultas.

**Tradeoff:** requiere mantener la conexión WS abierta durante toda la generación. Si el cliente se desconecta a mitad del stream, FastAPI sigue generando tokens que se descartan.

### Migración TypeScript → JavaScript puro

**Por qué:** el proyecto tiene un equipo pequeño y los beneficios de TypeScript (autocompletado, seguridad de tipos) requerían una curva de configuración (tsconfig, eslint-typescript) que no compensaba para el tamaño del proyecto.

**Tradeoff:** sin tipos estáticos, los errores de contrato entre componentes y servicios solo se detectan en runtime.

### Supabase con RLS deshabilitado y acceso via service_role

**Por qué:** toda autenticación ocurre en el BFF/FastAPI antes de llegar a Supabase. Activar RLS requeriría mapear los user IDs del JWT al sistema de auth de Supabase, duplicando la lógica de autenticación.

**Tradeoff:** un bug en el BFF o FastAPI que permita una request no autenticada tendría acceso total a Supabase. El riesgo está mitigado por `requireAuth` en todas las rutas del BFF.

---

## 7. Pendientes y deuda técnica

### Funcionalidad incompleta

| Item | Detalle | Prioridad |
|---|---|---|
| `GET /auth/profile` en FastAPI | El BFF lo sirve desde la sesión Redis. Si la sesión expira y se renueva, el perfil puede quedar desactualizado | Media |
| Analytics | `GET /analytics/me` y `/analytics/admin` no implementados en FastAPI. El frontend ya tiene las páginas `HistoryPage` y `AdminPage` | Media |
| Audio e imágenes en chat WS | El endpoint WS retorna `not implemented yet` para `type: audio` e `type: image` | Baja |

### Seguridad

| Item | Detalle |
|---|---|
| Rate limiting deshabilitado | `bff/src/middleware/rateLimiter.js` tiene los limiters comentados. Reactivar antes de exponer a producción (5 intentos/15min en login, 3 registros/hora) |
| Cookie `secure: false` en dev | `bff/src/server.js` activa `secure` solo en producción — correcto, pero verificar que el deploy use `NODE_ENV=production` |

### Deuda técnica

| Item | Detalle |
|---|---|
| `motorcycles` y `motorcycles_completed` | Tablas legacy en Supabase del sistema anterior. El flujo activo usa `ingresos_taller`. Evaluar migración y drop |
| `web/src/services/workshopService.js` | Servicio frontend que puede estar llamando directamente a Supabase. Auditar y redirigir al BFF |
| Logs de debug en producción | `console.log('[proxy]...', proxyReq.getHeaders())` en `proxy.routes.js` — eliminar antes de producción |
| `create_test_users.py` | Script útil en dev, no debe existir en la imagen de producción. Agregar a `.dockerignore` |
