# Guia de Instalacion

Todos los servicios de datos (PostgreSQL, MongoDB, Redis) corren en la nube. Solo necesitas Docker y el archivo `.env` con las credenciales.

Hay dos formas de correr el proyecto: **con Docker** (recomendado) o **sin Docker** (manual).

---

## Opcion A — Con Docker (recomendado)

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.

### Pasos

**1. Credenciales**
Pide el archivo `.env` al lider del equipo y pegalo en la raiz del proyecto (al lado de `docker-compose.yaml`).

**2. Arrancar**
```bash
docker compose up -d --build
```
Espera unos minutos. El backend esta listo cuando ves en los logs:
```
Application startup complete.
```

**3. Crear usuario admin (solo la primera vez)**
```bash
docker exec motorconnect-backend python3 create_admin.py
```
- Email: `admin@pegasus.com`
- Password: `AdminPassword123!`

**4. Abrir la app**
- Frontend: http://localhost:5173
- API docs: http://localhost:8001/docs

---

## Opcion B — Sin Docker (manual)

### Requisitos
- Python 3.11+
- Node.js 18+ y npm

### Paso 1 — Credenciales
Pide el archivo `.env` al lider del equipo y pegalo en la raiz del proyecto.

### Paso 2 — Backend
Abre una terminal en la carpeta `backend`:

```bash
cd backend

# Crear entorno virtual
python3 -m venv venv

# Activar (Linux/Mac)
source venv/bin/activate

# Activar (Windows)
# .\venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Arrancar
uvicorn main:app --reload --port 8000
```

El backend queda en http://localhost:8000

### Paso 3 — Frontend
Abre **otra terminal** en la carpeta `web`:

```bash
cd web
npm install
npm run dev
```

La app queda en http://localhost:5173

### Paso 4 — Crear usuario admin (solo la primera vez)
```bash
cd backend
source venv/bin/activate
python3 create_admin.py
```
- Email: `admin@pegasus.com`
- Password: `AdminPassword123!`

---

## Comandos utiles

```bash
# Ver logs del backend en tiempo real
docker compose logs -f backend

# Reconstruir solo el backend (cambios en Python)
docker compose up --build -d backend

# Reconstruir solo el frontend (cambios en React)
docker compose up --build -d web

# Parar todo
docker compose down
```

## Si algo falla

**El backend no arranca:**
```bash
docker compose logs -f backend
```

**Puerto ocupado:**
```bash
kill $(lsof -ti:8000)
```

**Problema de credenciales:** Verifica que el archivo `.env` este en la raiz del proyecto y tenga todas las variables. Pide el `.env` actualizado al lider del equipo.
