# Installation and Setup Guide — MotorConnect

All services run locally in Docker containers. The only external dependencies are Supabase (business tables) and OpenAI.

---

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

---

## Steps (new machine)

### 1. Clone the repository

```bash
git clone <repo-url>
cd pegasusSolucionAuteco
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in these variables (the rest have sane defaults):

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase `service_role` key |
| `OPENAI_API_KEY` | OpenAI API key |
| `JWT_SECRET` | Random string, at least 32 characters |
| `SESSION_SECRET` | Random string, at least 32 characters |

### 3. Start all services

```bash
docker compose up -d --build
```

Wait ~30 seconds for healthchecks to pass, then verify:

```bash
docker compose ps
```

All services should report `healthy` before continuing.

### 4. Create test users (first time only)

```bash
# Admin user
docker compose exec backend python create_admin.py

# Secretary and mechanic users
docker compose exec backend python create_test_users.py
```

---

## Access URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| BFF (Express) | http://localhost:3000 |
| Backend FastAPI docs | http://localhost:8001/docs |

---

## Test credentials

| Role | Email | Password |
|---|---|---|
| admin | admin@pegasus.com | `AdminPassword123!` |
| secretario | secretario@pegasus.com | `TallerPassword123!` |
| mecanico | mecanico@pegasus.com | `TallerPassword123!` |

---

## Frontend development outside Docker (optional)

For native Vite hot-reload without rebuilding the image:

```bash
# Start only the infrastructure (without the web container)
docker compose up -d db mongodb redis qdrant backend bff

# In another terminal
cd web
npm install
npm run dev
```

The app will be available at http://localhost:5174 (Vite picks an available port).

---

## Useful commands

```bash
# View logs in real time
docker compose logs -f

# View logs for a specific service
docker compose logs -f backend
docker compose logs -f bff

# Rebuild a single service
docker compose up --build -d backend
docker compose up --build -d bff

# Stop everything
docker compose down

# Stop everything and remove volumes (resets the databases)
docker compose down -v
```

---

## Troubleshooting

**Chat keeps loading or times out:**
MongoDB may have failed to start or have a corrupted volume.
```bash
docker compose up -d --force-recreate mongodb backend
```

**401 error on all chat routes:**
The BFF isn't forwarding the JWT to FastAPI. Make sure `JWT_SECRET` is identical in `.env` for both services.

**Vite starts on port 5174 instead of 5173:**
This happens when the frontend runs outside Docker and port 5173 is taken. Update `CORS_ORIGIN=http://localhost:5174` in `.env` and restart the BFF:
```bash
docker compose restart bff
```
