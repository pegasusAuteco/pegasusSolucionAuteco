# 🚀 Configuración Rápida (Cualquier PC)

Sigue estos 4 pasos para poner a correr el proyecto desde cero:

### 1. Requisitos
Tener instalado [Docker Desktop](https://www.docker.com/products/docker-desktop/).

### 2. Configurar Credenciales
Copia el archivo de ejemplo a uno real:
```bash
cp .env.example .env
```
**IMPORTANTE**: Abre el archivo `.env` recién creado y pega las llaves:
- `OPENAI_API_KEY=tu_llave_aqui`
- `SUPABASE_URL=la_url_de_supabase`
- `SUPABASE_SERVICE_KEY=la_llave_de_supabase`

### 3. Arrancar el Proyecto
Ejecuta este comando en la terminal (dentro de la carpeta del proyecto):
```bash
docker compose up -d --build
```
*Espera unos minutos a que descargue todo y el estado de la base de datos sea "Healthy".*

### 4. Crear Usuario Admin
Una vez que todo esté corriendo, ejecuta esto para tener acceso total:
```bash
docker exec motorconnect-backend python3 create_admin.py
```
- **Login**: `admin@pegasus.com`
- **Password**: `AdminPassword123!`

---

## 🔗 Enlaces útiles
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Documentación API**: [http://localhost:8001/docs](http://localhost:8001/docs)

## 🛠 Si algo falla
Si el backend no arranca, revisa los errores con:
```bash
docker compose logs -f backend
```
