# Guía de Instalación y Configuración - Pegasus Taller

El entorno de Pegasus ha evolucionado hacia una **arquitectura local-first**. Esto significa que todos los servicios principales (PostgreSQL, MongoDB, Redis, Qdrant y FastAPI Backend) corren localmente en contenedores Docker para sortear bloqueos de red y firewalls (como los de la academia). Las únicas dependencias en la nube son Supabase (para tablas y Storage de imágenes) y OpenAI/Groq.

Hay dos formas de correr el proyecto: **con Docker** (recomendado y oficial) o **sin Docker** (manual, solo para pruebas rápidas del backend).

---

## Opción A — Con Docker (Recomendado)

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo en tu máquina.
- Clonar el repositorio.

### Pasos

**1. Archivo de Variables de Entorno (`.env`)**
Debes tener el archivo `.env` configurado en la raíz del proyecto (al nivel de `docker-compose.yaml`).
Si no lo tienes, solicítalo al líder técnico o usa el `.env.example`.
Asegúrate de que tus variables apunten a los contenedores locales, por ejemplo:
```env
DATABASE_URL=postgresql+asyncpg://motorconnect:localdev123@db:5432/motorconnect_db
MONGO_URI=mongodb://motorconnect:localdev123@mongodb:27017/motorconnect_logs?authSource=admin
REDIS_URL=redis://redis:6379/0
```

**2. Construir y Arrancar la Infraestructura**
Ejecuta el siguiente comando para levantar la base de datos (Postgres), MongoDB, Redis, Qdrant, Backend y Frontend:
```bash
docker compose up -d --build
```
> **Nota:** Si tienes un volumen de MongoDB corrupto o de una versión anterior que te genera error "timeout" en el chat, asegúrate de recrear los contenedores limpiamente con:
> `docker compose up -d --force-recreate mongodb backend`

**3. Crear el Usuario Administrador (Solo la primera vez)**
Como la base de datos de usuarios ahora vive localmente en tu contenedor de Postgres, debes sembrar el usuario principal:
```bash
docker exec motorconnect-backend python3 create_admin.py
```
Credenciales por defecto:
- Email: `admin@pegasus.com`
- Password: `AdminPassword123!`

**4. Acceso a la Aplicación**
- **Frontend (Taller, Chat y Mecánicos):** http://localhost:5173
- **Documentación API Backend:** http://localhost:8001/docs

---

## Opción B — Desarrollo Manual (Sin Docker)
*Solo si estás editando intensamente el frontend y deseas usar la infraestructura de Docker para el backend pero el frontend corriendo nativo con Vite.*

1. Levanta los servicios base (Base de datos, Mongo, Redis, Backend) usando Docker:
```bash
docker compose up -d db mongodb redis qdrant backend
```

2. Abre una terminal nueva en la carpeta `web/` e instala Node:
```bash
cd web
npm install
npm run dev
```

La app estará disponible en http://localhost:5173 con Hot-Reloading, conectándose al backend de Docker que expone el puerto `8001`.

---

## Comandos Útiles de Mantenimiento

```bash
# Ver logs del backend para depurar fallos en el chat o en login
docker compose logs -f backend

# Ver logs del frontend (Nginx)
docker compose logs -f web

# Reconstruir SOLO el backend (si hiciste cambios en Python)
docker compose up --build -d backend

# Reconstruir SOLO el frontend (si hiciste cambios en React)
docker compose up --build -d web

# Detener todos los contenedores y liberar la red
docker compose down
```

## Solución de Problemas Comunes

1. **Error 502 Bad Gateway en Frontend:**
   Ocurre si reiniciaste el contenedor del backend pero dejaste vivo el contenedor del frontend (`web`). Nginx almacena en caché la IP vieja del backend.
   *Solución:* Reinicia Nginx con `docker compose restart web`.

2. **El Chat carga infinito o se queda en blanco (Timeout):**
   Ocurre si MongoDB falló al iniciar o tiene un volumen corrupto antiguo. 
   *Solución:* Elimina el volumen viejo o asegúrate de forzar la recreación: `docker compose up -d --force-recreate mongodb backend`.


