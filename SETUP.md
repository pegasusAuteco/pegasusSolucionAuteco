# Guía de Instalación y Configuración — MotorConnect

Todos los servicios corren localmente en contenedores Docker. Las únicas dependencias externas son Supabase (tablas de negocio) y OpenAI.

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Git

---

## Pasos (computador nuevo)

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd pegasusSolucionAuteco
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y completa estas variables (las demás vienen bien por defecto):

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Clave `service_role` de Supabase |
| `VITE_SUPABASE_URL` | La misma URL de Supabase (expuesta al browser) |
| `VITE_SUPABASE_KEY` | Clave `anon/public` de Supabase |
| `OPENAI_API_KEY` | Clave de API de OpenAI |
| `JWT_SECRET` | String aleatorio, mínimo 32 caracteres |
| `SESSION_SECRET` | String aleatorio, mínimo 32 caracteres |

### 3. Levantar todos los servicios

```bash
docker compose up -d --build
```

Espera ~30 segundos a que los healthchecks pasen. Puedes verificar con:

```bash
docker compose ps
```

Todos los servicios deben estar en estado `healthy` antes de continuar.

### 4. Agregar roles al enum de PostgreSQL (solo primera vez)

```bash
docker compose exec db psql -U motorconnect -d motorconnect_db -c "
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'secretario';
ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'mecanico';
"
```

### 5. Crear usuarios de prueba (solo primera vez)

```bash
# Usuario admin
docker compose exec backend python create_admin.py

# Usuarios secretario y mecánico
docker compose exec backend python create_test_users.py
```

---

## URLs de acceso

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| BFF (Express) | http://localhost:3000 |
| Backend FastAPI docs | http://localhost:8000/docs |

---

## Credenciales de prueba

| Rol | Email | Password |
|---|---|---|
| admin | admin@pegasus.com | `AdminPassword123!` |
| secretario | secretario@pegasus.com | `TallerPassword123!` |
| mecanico | mecanico@pegasus.com | `TallerPassword123!` |

---

## Desarrollo del frontend fuera de Docker (opcional)

Si quieres hot-reload nativo de Vite sin reconstruir la imagen:

```bash
# Levantar solo la infraestructura (sin el contenedor web)
docker compose up -d db mongodb redis qdrant backend bff

# En otra terminal
cd web
npm install
npm run dev
```

La app estará en http://localhost:5174 (Vite elige el puerto disponible).

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f bff

# Reconstruir un solo servicio
docker compose up --build -d backend
docker compose up --build -d bff

# Detener todo
docker compose down

# Detener todo y borrar volúmenes (resetea las bases de datos)
docker compose down -v
```

---

## Solución de problemas

**El chat se queda cargando o da timeout:**
MongoDB puede haber fallado al iniciar o tener un volumen corrupto.
```bash
docker compose up -d --force-recreate mongodb backend
```

**Error 401 en todas las rutas del chat:**
El BFF no está reenviando el JWT a FastAPI. Verifica que `JWT_SECRET` sea idéntico en `.env` para ambos servicios.

**Vite arranca en el puerto 5174 en vez de 5173:**
Ocurre cuando el frontend corre fuera de Docker y el puerto 5173 está ocupado. Actualiza `CORS_ORIGIN=http://localhost:5174` en `.env` y reinicia el BFF:
```bash
docker compose restart bff
```
