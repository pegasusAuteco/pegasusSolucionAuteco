# Plan de Implementación — User Stories Workshop

> **Última actualización:** 2026-05-22 — Sesión de implementación backend + integración frontend completada.

---

## Estado de brechas

| US | Brecha | Estado |
|---|---|---|
| US1 | Datos guardados solo en `localStorage` — sin base de datos ni API | ✅ Resuelto (Pasos 1–4) |
| US1 | Sin validación de placa única | ✅ Resuelto en backend (Paso 2) — visualización pendiente en frontend (Paso 5) |
| US2 | Form de repuestos sin entrada por voz | ⏳ Pendiente frontend (Paso 6) |
| US2 | Botón para eliminar repuesto individual | ✅ Implementado y conectado al backend (Paso 7) |

---

## User Story 1 — Registro de Motos

> Como mecánico, quiero registrar una moto usando su placa y modelo para tener un identificador único en el dashboard.

---

### Paso 1 — Backend: modelo y tabla en PostgreSQL

Crear `backend/workshop/models/motorcycle.py` con SQLAlchemy.

**Tabla `motorcycles`:**

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | UUID | PK |
| `client_name` | String | NOT NULL |
| `client_id` | String | NOT NULL |
| `email` | String | opcional |
| `model` | String | NOT NULL |
| `plate` | String | UNIQUE, NOT NULL |
| `mileage` | Integer | NOT NULL |
| `entry_date` | Date | NOT NULL |
| `observations` | Text | NOT NULL |
| `mechanic_notes` | Text | opcional |
| `status` | Enum(`pending`, `finished`) | default `pending` |
| `created_at` | DateTime | auto |
| `updated_at` | DateTime | auto, se actualiza en cada PATCH |

**Tabla `parts`:**

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | UUID | PK |
| `motorcycle_id` | UUID | FK → motorcycles.id ON DELETE CASCADE |
| `name` | String | NOT NULL |
| `quantity` | Integer | NOT NULL, default 1 |
| `created_at` | DateTime | auto |

> ✅ **COMPLETADO** — `backend/workshop/models/motorcycle.py` existía con los modelos `Motorcycle` y `Part`. Se verificó que la restricción `UNIQUE` en `plate` está definida a nivel de base de datos (no solo en la capa de aplicación), garantizando integridad aunque se llame al backend por múltiples vías. Las tablas se crean automáticamente en el arranque del servidor vía `Base.metadata.create_all`.

---

### Paso 2 — Backend: endpoints REST de motocicletas

Crear `backend/workshop/router.py` y registrar en `backend/main.py`.

```
POST   /workshop/motorcycles              Registrar moto → 409 si placa duplicada
GET    /workshop/motorcycles              Listar todas → ?status=pending|finished
PATCH  /workshop/motorcycles/{id}         Actualizar datos de la moto
PATCH  /workshop/motorcycles/{id}/finish  Marcar como terminada
DELETE /workshop/motorcycles/{id}         Eliminar registro
```

Todos los endpoints requieren JWT válido (mismo middleware que `chat/router.py`).

> ✅ **COMPLETADO** — Archivos creados: `backend/workshop/schemas.py` (modelos Pydantic de request/response) y `backend/workshop/router.py` (todos los endpoints). El router fue registrado en `backend/main.py` con `app.include_router(workshop_router)`.
>
> **Observación:** El error 409 por placa duplicada se captura interceptando la `IntegrityError` de SQLAlchemy cuando PostgreSQL viola la restricción `UNIQUE`. El mensaje devuelto incluye la placa exacta para que el frontend pueda mostrarlo en el campo correspondiente:
> ```json
> { "detail": "La placa ABC12D ya está registrada en el sistema." }
> ```

---

### Paso 3 — Backend: endpoints REST de repuestos

```
POST   /workshop/motorcycles/{id}/parts             Agregar repuesto
DELETE /workshop/motorcycles/{id}/parts/{part_id}   Eliminar repuesto
```

> ✅ **COMPLETADO** — Incluidos en el mismo `backend/workshop/router.py` del Paso 2. Al agregar un repuesto se valida que la moto padre exista antes de crear el `Part`; si no existe se retorna 404. Al eliminar se verifica que el `part_id` pertenezca a la moto indicada en la ruta, evitando eliminaciones cruzadas entre motos.

---

### Paso 4 — Frontend: migrar de Context + localStorage a TanStack Query

Reemplazar las acciones de `WorkshopContext` por queries y mutations de TanStack Query.

**Hooks implementados en `web/src/hooks/useWorkshop.ts`:**

```ts
useWorkshop()           // UI state: { activeRepairId, setActiveRepairId }
useMotorcycles(status?) // GET /workshop/motorcycles
useRegisterMotorcycle() // POST /workshop/motorcycles
useUpdateMotorcycle()   // PATCH /workshop/motorcycles/{id}
useFinishRepair()       // PATCH /workshop/motorcycles/{id}/finish
useDeleteMotorcycle()   // DELETE /workshop/motorcycles/{id}
useAddPart()            // POST /workshop/motorcycles/{id}/parts
useRemovePart()         // DELETE /workshop/motorcycles/{id}/parts/{part_id}
```

`WorkshopContext` quedó reducido a solo `activeRepairId` (estado UI puro). El `localStorage` fue eliminado como fuente de verdad de los datos del taller.

> ✅ **COMPLETADO** — Archivos modificados: `types/index.ts`, `services/api.ts`, `contexts/WorkshopContext.tsx`, `hooks/useWorkshop.ts`, `MechanicDashboard.tsx`, `MotorcycleCard.tsx`, `CompactMechanicQueue.tsx`, `ReceptionForm.tsx`, `InvoiceModal.tsx`.
>
> **Observación:** El servicio `workshopService` en `api.ts` incluye un mapper que convierte la respuesta del backend (snake_case) al formato camelCase que usan los componentes React, de modo que los componentes existentes no requirieron cambios en sus templates JSX.

---

### Paso 5 — Frontend: visualización del error 409 de placa duplicada

> ⏳ **PENDIENTE — Responsabilidad del equipo frontend**

**Contexto:** El backend ya retorna correctamente el error 409. En `ReceptionForm.tsx` la llamada a `registerMutation` ya tiene el `onError` configurado con un toast genérico. Lo que falta es convertir ese toast genérico en un error inline sobre el campo de placa.

---

#### Contrato de API para el frontend

**Endpoint:** `POST /workshop/motorcycles`

**Caso exitoso — HTTP 201:**
```json
{
  "id": "uuid",
  "client_name": "Juan Pérez",
  "client_id": "1234567890",
  "email": "juan@mail.com",
  "model": "Advance R 110",
  "plate": "ABC12D",
  "mileage": 5000,
  "entry_date": "2026-05-22",
  "observations": "Revisión general",
  "mechanic_notes": null,
  "status": "pending",
  "created_at": "2026-05-22T14:30:00Z",
  "updated_at": "2026-05-22T14:30:00Z",
  "parts": []
}
```

**Caso placa duplicada — HTTP 409:**
```json
{
  "detail": "La placa ABC12D ya está registrada en el sistema."
}
```

**Cómo acceder al error en el callback `onError` de TanStack Query:**

La función `apiFetch` en `lib/fetch.ts` ya normaliza los errores HTTP al siguiente formato:
```ts
error.response.status  // número → 409
error.response.data.detail  // string → "La placa ABC12D ya está registrada en el sistema."
```

**Implementación sugerida en `ReceptionForm.tsx`:**

En el callback `onError` del `registerMutation`, reemplazar el toast genérico por:
```ts
onError: (error: any) => {
  if (error?.response?.status === 409) {
    // Muestra el mensaje directamente bajo el campo "plate"
    setErrors((prev) => ({ ...prev, plate: error.response.data.detail }));
  } else {
    addToast('error', 'Error al guardar el registro');
  }
}
```

El mensaje se limpiará automáticamente cuando el usuario edite el campo, ya que `handleChange` hace `setErrors((prev) => ({ ...prev, [name]: '' }))` en cada keystroke.

---

## User Story 2 — Adición de Repuestos

> Como mecánico, quiero poder agregar repuestos a una moto (usando texto o voz) para que el requerimiento quede documentado.

---

### Paso 6 — Frontend: hook reutilizable de voz

> ⏳ **PENDIENTE — Responsabilidad del equipo frontend**

**Contexto:** El endpoint de transcripción ya existe en el backend. El frontend solo necesita crear el hook y conectarlo al formulario de repuestos.

---

#### Contrato de API para el frontend

**Endpoint:** `POST /api/transcribe`

**Request:** `multipart/form-data`
```
Campo: "audio"
Valor: Blob de audio grabado con MediaRecorder (formato webm/ogg, según el navegador)
```

**Ejemplo de llamada desde el hook:**
```ts
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');

const response = await apiFetch<{ text: string }>(`${baseURL}/api/transcribe`, {
  method: 'POST',
  body: formData,
  // No agregar Content-Type manualmente — fetch lo infiere con el boundary correcto
});

const transcript = response.text; // "Filtro de aceite"
```

**Respuesta exitosa — HTTP 200:**
```json
{
  "text": "Filtro de aceite"
}
```

**Respuesta de error — HTTP 400/500:**
```json
{
  "detail": "No se pudo transcribir el audio"
}
```

**Autenticación:** El endpoint requiere JWT en el header `Authorization: Bearer <token>`. La función `apiFetch` lo inyecta automáticamente desde `localStorage`.

---

**Interfaz del hook a implementar en `web/src/hooks/useVoiceRecorder.ts`:**

```ts
{
  isRecording: boolean       // true mientras el micrófono está activo
  toggleRecording: () => void // inicia o detiene la grabación
  transcript: string          // texto transcrito, listo para usar en el input
  clearTranscript: () => void // limpia el transcript (llamar después de usar el valor)
}
```

**Comportamiento esperado al integrar en `MotorcycleCard.tsx`:**

```
[ Filtro de aceite       ] [ 1 ] [ 🎤 ] [ + ]
  ↑ texto o transcripción       ↑ voz  ↑ agregar
```

- Al presionar el micrófono, el botón cambia a estado activo (rojo/pulsante).
- Al detener, el texto transcrito se escribe en el campo de nombre del repuesto.
- El mecánico puede ajustarlo antes de presionar `+`.
- La lógica de grabación ya existe en `ChatInput.tsx` — extraerla al hook en lugar de duplicarla.

---

### Paso 7 — Frontend: eliminar repuesto individual

> ✅ **COMPLETADO** — Botón `Trash2` implementado en `MotorcycleCard.tsx` y `CompactMechanicQueue.tsx`. Durante el Paso 4, las llamadas que antes iban al contexto local (`removePartFromEntry`) fueron migradas al endpoint real:
> ```
> DELETE /workshop/motorcycles/{id}/parts/{part_id}
> ```
> La query `['workshop']` se invalida automáticamente al completar la mutation, actualizando la lista sin recargar la página.

---

## Tabla de ejecución final

| # | Tarea | Capa | Estado |
|---|---|---|---|
| 1 | Modelo SQLAlchemy + tablas `motorcycles` y `parts` | Backend | ✅ Completado |
| 2 | Endpoints CRUD `/workshop/motorcycles` | Backend | ✅ Completado |
| 3 | Endpoints CRUD `/workshop/motorcycles/{id}/parts` | Backend | ✅ Completado |
| 4 | Migrar frontend Context + localStorage → TanStack Query | Frontend | ✅ Completado |
| 5 | Visualización error 409 placa duplicada en `ReceptionForm` | Frontend | ⏳ Pendiente — ver contrato arriba |
| 6 | Hook `useVoiceRecorder` + botón de voz en `MotorcycleCard` | Frontend | ⏳ Pendiente — ver contrato arriba |
| 7 | Botón eliminar repuesto individual + conexión al backend | Frontend | ✅ Completado |

---

## Componentes existentes no previstos en el plan original

| Componente | Descripción | Estado de integración |
|---|---|---|
| `InvoiceModal.tsx` | Modal de factura con costos ficticios (labor fijo + precio fijo por repuesto) | Import de `MotorcycleEntry` corregido. Los costos siguen siendo ficticios hasta que el backend exponga precios reales. |
| `CompactMechanicQueue.tsx` | Vista compacta del mecánico activo: panel de reparación + notas + repuestos | Conectado al backend en el Paso 4. `addPartToEntry` y `removePartFromEntry` reemplazados por `useAddPart()` y `useRemovePart()`. |
