# MotorConnect — System Architecture

**Version:** 2.1 | **Date:** 2026-06-11

---

## 1. Executive Summary

MotorConnect is a web platform for Auteco Mobility motorcycle workshops. It centralises three core functions:

- **Workshop reception:** digital registration of motorcycle intake, mechanic assignment, and status tracking.
- **Mechanic dashboard:** work queue filtered without customer PII, real-time status updates.
- **AI technical assistant (Pegasus):** streaming chatbot that answers questions about technical manuals using RAG (Retrieval-Augmented Generation) over Auteco's official manuals.

Version 2.0 migrated the frontend from TypeScript to plain JavaScript, introduced a BFF (Backend For Frontend) in Node.js/Express to centralise authentication, and replaced synchronous chat with WebSocket token-by-token streaming.

---

## 2. Technology Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | 18 | Declarative UI |
| Vite | 5.4 | Build tool + dev server |
| Zustand | — | Global state (auth, toasts) |
| TanStack Query | — | Remote data cache, mutations |
| React Router | — | SPA navigation |
| Tailwind CSS | — | Utility-first styles |
| Zod | — | Runtime form validation |
| Lucide React | — | Iconography |

### BFF (Backend For Frontend)
| Technology | Version | Role |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Express | 4.19 | HTTP framework |
| express-session | 1.18 | Session management |
| connect-redis | 7.1 | Redis-backed session store |
| ws | 8.21 | WebSocket server (proxy) |
| http-proxy-middleware | 3.0 | HTTP proxy to FastAPI |
| helmet | 7.1 | HTTP security headers |
| pino | 9 | Structured logging |
| express-rate-limit | 8.5 | Rate limiting (prepared, disabled in dev) |

### AI Backend
| Technology | Version | Role |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | — | HTTP + WebSocket framework |
| Uvicorn | — | ASGI server |
| SQLAlchemy (async) | — | PostgreSQL ORM |
| OpenAI SDK | — | LLM (gpt-4o-mini) + embeddings |
| Motor | — | Async MongoDB client |
| Passlib + bcrypt | — | Password hashing |
| python-jose | — | JWT generation and validation |
| OpenAI Whisper (via SDK) | — | STT: audio-to-text transcription |
| OpenAI TTS / ElevenLabs | — | TTS: response-to-speech synthesis (configurable provider) |

### Databases
| System | Usage |
|---|---|
| PostgreSQL (local) | Users, authentication, and audio messages (`audio_messages`) |
| Supabase (PostgreSQL) | Workshop data: intakes, motorcycles, mechanics |
| MongoDB | Chat conversation history |
| Redis | BFF sessions |
| Qdrant | Embedding vectors for RAG |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER  (React + Vite, port 5174)                         │
│                                                              │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ LoginPage│  │ WorkshopPage │  │ ChatPage (WebSocket) │   │
│  └──────────┘  └──────────────┘  └─────────────────────┘   │
└──────────────────────┬──────────────────────┬───────────────┘
                       │ HTTP REST             │ WebSocket
                       ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BFF — Express/Node  (port 3000)                            │
│                                                              │
│  /api/auth/*     → authRoutes   (login, register, logout)   │
│  /api/workshop/* → workshopRoutes → Supabase                │
│  /api/history/*  → historyRoutes  → Supabase                │
│  /api/chat/ws/*  → chatWsProxy    (upgrade handler)         │
│  /api/*          → proxyRoutes    → FastAPI (HTTP)          │
│                                                              │
│  Security: helmet · cors · express-session/Redis            │
│             requireAuth · rate limiting (prep.)             │
└──────────────────────┬──────────────────────┬───────────────┘
                       │ HTTP                  │ WebSocket
                       ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│  FASTAPI — Python  (port 8000)                              │
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
│(local) │ │(logs) │ │(vectors) │ │(workshop)│
└────────┘ └───────┘ └──────────┘ └──────────┘
               ▲
         ┌─────┘
         │ Redis (BFF sessions)
```

---

## 4. Layer Descriptions

### 4.1 Frontend — React + Vite (Plain JS)

The frontend is a plain JavaScript SPA (no TypeScript). Uses Vite as dev server and bundler.

**Global state:**
- `authStore` (Zustand): authenticated user, logout action
- `toastStore` (Zustand): notification queue (max 3 simultaneous)

**Remote data cache:**
- TanStack Query manages conversation and message queries
- Mutations (`useSendMessage`, `useCreateConversation`) use `retry: 0` and `onSettled` to avoid stuck states

**Key components:**

| Component | Function |
|---|---|
| `ChatContainer.jsx` | Chat interface: WS streaming + POST fallback + push-to-talk with waveform, hands-free mode (lock/unlock) and safe cancellation |
| `VoiceMessagePlayer.jsx` | TTS audio player embedded in Pegasus response bubbles |
| `ReceptionForm.jsx` | Motorcycle intake form (Zod validation) |
| `MechanicDashboard.jsx` | Mechanic dashboard with work queue |
| `CompactMechanicQueue.jsx` | Compact queue view for sidebar |
| `Layout.jsx` + `Navbar.jsx` | Application shell |
| `ProtectedRoute.jsx` | Role-based route guard |
| `ToastViewport.jsx` | Notification system |

**Server communication:**
- `apiFetch()` in `lib/fetch.js`: wrapper around `fetch` with configurable timeout (default 15s, chat 120s), normalised error handling, redirect to login on 401
- `useChatWebSocket.js`: hook that manages WS connection, Blob parsing, automatic reconnection (max 3 attempts), and `onError` callback

### 4.2 BFF — Express + Node

The BFF is the single entry point from the browser. It centralises:

1. **Session-based authentication**: the FastAPI JWT is stored in Redis (not in localStorage). The browser only receives an `httpOnly` cookie. This eliminates the risk of XSS stealing tokens.

2. **HTTP proxy to FastAPI**: `http-proxy-middleware` v3 forwards all `/api/*` requests with the `Authorization: Bearer` header injected from the session. `fixRequestBody()` re-injects the JSON body that `express.json()` already consumed.

3. **WebSocket proxy**: the `server.on('upgrade')` handler intercepts the WS handshake, reads the Redis session to extract the JWT, and establishes a bidirectional bridge to FastAPI with a message queue.

4. **Direct Supabase routes**: workshop and history call the Supabase SDK directly from the BFF, bypassing FastAPI.

**Exposed routes:**

| Method | Route | Auth | Destination |
|---|---|---|---|
| POST | `/api/auth/login` | No | FastAPI → Redis session |
| POST | `/api/auth/register` | No | FastAPI |
| POST | `/api/auth/logout` | No | Destroys session |
| GET | `/api/auth/profile` | Yes | Redis session |
| GET | `/api/workshop/motorcycles` | Yes | Supabase |
| GET | `/api/workshop/mechanic-queue` | Yes | Supabase (view) |
| POST | `/api/workshop/ingreso` | Yes | Supabase |
| PUT | `/api/workshop/motorcycles/:id` | Yes | Supabase |
| GET/DELETE | `/api/history/*` | Yes | Supabase |
| WS | `/api/chat/ws/:id` | Session cookie | FastAPI WS |
| POST | `/api/voice/transcribe` | Yes | FastAPI (multipart: audio + conversation_id) |
| GET | `/api/voice/audio/:id` | Yes | FastAPI (stored TTS audio stream) |
| * | `/api/*` | Yes | FastAPI (proxy) |

### 4.3 AI Backend — FastAPI + Python

FastAPI handles exclusively AI logic and authentication:

**Authentication:** generates and validates JWTs with `python-jose`. The `usuarios` table lives in local PostgreSQL with bcrypt for password hashing.

**RAG pipeline:**
1. `retrieve_context(query)` — cosine similarity search in Qdrant over technical manual embeddings
2. `generate_answer_stream(query, chunks, history)` — builds the prompt with retrieved context and calls OpenAI with `stream=True` via `AsyncOpenAI`
3. Each token delta is sent via WebSocket immediately (`send_json({type: "token", content: delta})`)
4. On completion, saves the full message to MongoDB and sends `{type: "done"}`

**WebSocket (`/chat/ws/{conversation_id}`):** the JWT arrives as query param `?token=` (the browser cannot send headers in the WS handshake). The conversation is verified before `accept()`. `retrieve_context` runs in `asyncio.to_thread()` to avoid blocking the asyncio event loop.

**Voice pipeline (`POST /voice/transcribe`):**
1. Receives `multipart/form-data` with the audio file and `conversation_id`
2. `audio_service.transcribe()` — sends audio to OpenAI Whisper and obtains the transcription
3. `retrieve_context(transcription)` — same RAG pipeline as text
4. `generate_answer(transcription, chunks, history)` — calls the LLM and obtains the text response
5. `tts_provider.synthesize(response)` — converts the response to audio (OpenAI TTS or ElevenLabs, depending on `TTS_PROVIDER` in config)
6. Saves user audio and response to the `audio_messages` table (local PostgreSQL)
7. Returns `{ transcription, response, audio_id }` to the BFF; audio is later served via `GET /voice/audio/{id}`

### 4.4 Databases

**Local PostgreSQL** — users and authentication. Managed by SQLAlchemy async. The `userrole` enum has four values: `employee`, `admin`, `mecanico`, `secretario`.

**Supabase (PostgreSQL)** — business data. Direct access via `@supabase/supabase-js` from the BFF with `service_role` key. RLS disabled on all tables. Main tables: `usuarios`, `ingresos_taller`, `motorcycles`, `parts`, `manuales_chunks`, `fallas_diagnostico`.

**MongoDB** — conversation history. `conversations` collection stores messages for each chat session. Queried by FastAPI to pass recent history to the LLM as context.

**Redis** — BFF sessions. Each session stores `{ jwt, user, cookie }`. TTL of 24 hours. The WebSocket proxy reads the JWT directly from Redis without going through Express.

**Qdrant** — vector database for RAG. Stores embeddings of Auteco technical manual chunks. Cosine similarity search returns the `k` most relevant fragments for each query.

---

## 5. Main Flows

### 5.1 Authentication Flow

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
   │◄── response ───────────│◄── response ─────────────│
```

### 5.2 WebSocket Streaming Chat Flow

```
Browser                    BFF                      FastAPI           OpenAI
   │                        │                          │                 │
   │── WS upgrade ──────────►                          │                 │
   │   /api/chat/ws/{id}    │  Read sess:{id} → JWT    │                 │
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

### 5.3 Motorcycle Workshop Intake Flow

```
Browser (Secretary)        BFF                      Supabase
   │                        │                          │
   │── POST /api/workshop/  │                          │
   │   ingreso ─────────────►                          │
   │   { cliente, placa,    │── INSERT ingresos_taller ►
   │     marca_modelo, ... }│   estado = 'en_cola'     │
   │                        │◄── { id, ... } ──────────│
   │◄── 201 { ingreso } ────│                          │
   │                        │                          │
   │ (Mechanic Dashboard)   │                          │
   │── GET /api/workshop/   │                          │
   │   mechanic-queue ──────►                          │
   │                        │── SELECT vista_mecani… ──►
   │                        │   cos_ingresos           │
   │◄── [{ id, marca_modelo,│◄── rows ─────────────────│
   │      placa, estado }]──│   (no PII)               │
   │                        │                          │
   │── PUT /api/workshop/   │                          │
   │   motorcycles/:id ─────►                          │
   │   { estado:"completada"}── UPDATE ingresos_taller ►
   │◄── 200 ────────────────│◄── ok ───────────────────│
```

### 5.4 Voice Query Flow (Push-to-Talk)

```
Browser (Mechanic)          BFF                      FastAPI           OpenAI / ElevenLabs
   │                        │                          │                      │
   │ holds mic button       │                          │                      │
   │ → records audio        │                          │                      │
   │   (WebAPI)             │                          │                      │
   │                        │                          │                      │
   │── POST /api/voice/ ────►                          │                      │
   │   transcribe           │── POST /voice/ ──────────►                      │
   │   multipart: audio +   │   transcribe             │── Whisper STT ───────►
   │   conversation_id      │   Authorization: Bearer  │◄── transcription ────
   │                        │                          │                      │
   │                        │                          │── RAG pipeline       │
   │                        │                          │   (Qdrant + LLM)     │
   │                        │                          │── TTS synthesis ─────►
   │                        │                          │◄── audio bytes ──────
   │                        │                          │                      │
   │                        │                          │ saves audio_messages │
   │◄── { transcription,    │◄── { transcription,      │                      │
   │      response,         │      response,           │                      │
   │      audio_id } ───────│      audio_id }          │                      │
   │                        │                          │                      │
   │ shows transcription    │                          │                      │
   │ as user bubble         │                          │                      │
   │ shows AI response      │                          │                      │
   │── GET /api/voice/ ─────►── GET /voice/audio/{id} ►                      │
   │   audio/{id}           │◄── audio bytes ──────────│                      │
   │◄── audio bytes ────────│                          │                      │
   │ VoiceMessagePlayer     │                          │                      │
   │ plays TTS              │                          │                      │
```

---

## 6. Key Technical Decisions

### BFF with Redis Sessions Instead of JWT in localStorage

**Why:** storing the JWT in localStorage exposes the token to XSS attacks. With Redis sessions and an `httpOnly` cookie, browser JavaScript can never read the token. The BFF injects the `Authorization` header into every FastAPI request transparently.

**Tradeoff:** adds operational complexity (Redis as a dependency) and ~1ms extra latency per Redis lookup for WebSocket.

### WebSocket in the BFF as Proxy with Manual Bridge Instead of Pass-Through

**Why:** `http-proxy-middleware` v3 does not support injecting headers into the WS handshake. The manual bridge (`server.on('upgrade')` + `ws.WebSocketServer`) allows reading the Redis session and passing the JWT as a query param to FastAPI, which is the only browser-supported method for WS authentication.

**Tradeoff:** the bidirectional bridge adds an extra copy of each frame in BFF memory.

### AsyncOpenAI with stream=True Instead of Waiting for Full Response

**Why:** the RAG pipeline (retrieval + LLM) takes between 5 and 30 seconds depending on complexity. Showing tokens in real time reduces perceived latency to under 1 second for most queries.

**Tradeoff:** requires keeping the WS connection open during the entire generation. If the client disconnects mid-stream, FastAPI continues generating tokens that are discarded.

### TypeScript → Plain JavaScript Migration

**Why:** the project has a small team, and the benefits of TypeScript (autocomplete, type safety) required a configuration overhead (tsconfig, eslint-typescript) that did not justify the project size.

**Tradeoff:** without static types, contract errors between components and services are only detected at runtime.

### Supabase with RLS Disabled and service_role Access

**Why:** all authentication occurs in the BFF/FastAPI before reaching Supabase. Enabling RLS would require mapping JWT user IDs to Supabase's auth system, duplicating the authentication logic.

**Tradeoff:** a bug in the BFF or FastAPI that allows an unauthenticated request would have full access to Supabase. The risk is mitigated by `requireAuth` on all BFF routes.

### Voice: Audio via HTTP Request/Response Instead of WebSocket

**Why:** audio is a complete transaction — the user records, stops, and sends a whole file; the server returns another whole file. It is not a continuous stream. The existing WebSocket is optimised for incremental text token streaming. Routing audio through WebSocket would require implementing chunking, framing, and binary reassembly that HTTP solves natively with `multipart/form-data`.

**Tradeoff:** each voice query opens a new HTTP connection. For the use case (one query every few seconds) it is irrelevant; it would only be a problem with continuous burst queries.

### Voice: Audio Passes Through the BFF, Not Directly to FastAPI

**Why:** the JWT never lives in the browser — it resides in Redis and only the BFF knows it. The frontend only has the `connect.sid` httpOnly cookie; it has no credentials to call FastAPI directly. The BFF proxy injects `Authorization: Bearer <jwt>` automatically.

**Tradeoff:** the audio file traverses an extra layer (BFF → FastAPI), adding latency proportional to the audio size (~1–5 MB). For workshop queries (< 30 seconds of audio) it is acceptable.

### Voice: Selective File Port from `feature/voice-comand`

**Why:** `feature/voice-comand` was forked from `main` before the TS→JS + BFF migration. A merge would generate simultaneous conflicts of three types: extension (`.tsx` vs `.jsx`), content, and architecture. The selective port (`git checkout <branch> -- <file>`) avoids this: the Python backend is copied almost verbatim and the frontend is rewritten in JSX reusing the proven logic.

**Tradeoff:** requires manually reviewing each ported file to ensure removed TS type references and module imports are updated.

---

## 7. Backlog and Technical Debt

### Incomplete Features

| Item | Details | Priority |
|---|---|---|
| `GET /auth/profile` in FastAPI | The BFF serves it from the Redis session. If the session expires and is renewed, the profile may be stale | Medium |
| Analytics | `GET /analytics/me` and `/analytics/admin` not implemented in FastAPI. The frontend already has `HistoryPage` and `AdminPage` | Medium |
| Continuous conversation mode (Phase 2) | Push-to-talk implemented. Hands-free mode (VAD + automatic loop) is designed in the plan but not developed. The HTTP audio architecture + `useVoiceLoop` is ready to plug in without refactoring existing code | Medium |

### Security

| Item | Details |
|---|---|
| Rate limiting disabled | `bff/src/middleware/rateLimiter.js` has limiters commented out. Re-enable before exposing to production (5 attempts/15min on login, 3 registrations/hour) |
| Cookie `secure: false` in dev | `bff/src/server.js` enables `secure` only in production — correct, but verify that the deploy uses `NODE_ENV=production` |

### Technical Debt

| Item | Details |
|---|---|
| `motorcycles` and `motorcycles_completed` | Legacy Supabase tables from the previous system. The active flow uses `ingresos_taller`. Evaluate migration and drop |
| `web/src/services/workshopService.js` | Frontend service that may be calling Supabase directly. Audit and redirect to BFF |
| Debug logs in production | `console.log('[proxy]...', proxyReq.getHeaders())` in `proxy.routes.js` — remove before production |
| `create_test_users.py` | Useful dev script, should not exist in the production image. Add to `.dockerignore` |
| Voice race condition on new conversation | If the user sends audio before `createConversation` resolves, the `conversation_id` is `null` in the multipart. The frontend saves the audio in `pendingBlobRef` and re-sends it in `useCreateConversation`'s `onSettled`. It does not fail, but adds an extra request | Low |
| Orphan socket when switching conversations | When selecting another conversation while streaming is active, the previous WS stays open until FastAPI closes the `done` frame. In practice the user notices nothing, but the BFF keeps the bridge open for a few extra seconds | Low |
| Whisper 502 on cold start | FastAPI loads the Whisper model on the first voice request (~3–8 seconds). If the BFF proxies before the model is loaded, FastAPI returns 502. Resolved with a `startup` warmup or tolerating retry from the frontend | Low |
