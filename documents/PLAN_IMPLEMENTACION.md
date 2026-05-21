# Plan de Implementación — User Stories Workshop

> Basado en `UserStory.md`. La tarea "Prev" (apartado visual) está completada.
> Este documento cubre las dos User Stories pendientes de funcionalidad real.

---

## Contexto: estado actual del frontend

### Lo que ya existe

| Archivo | Qué hace |
|---|---|
| `web/src/components/workshop/ReceptionForm.tsx` | Formulario completo: placa, modelo, cliente, km, observaciones |
| `web/src/components/workshop/MotorcycleCard.tsx` | Card con form de repuestos por texto, acciones editar/finalizar |
| `web/src/components/workshop/MechanicDashboard.tsx` | Cola de motos pendientes y finalizadas |
| `web/src/pages/WorkshopPage.tsx` | Página con tabs Recepción / Equipo Técnico |
| `web/src/store/workshopStore.ts` | `registerEntry`, `addPartToEntry`, `finishRepair`, etc. |
| `web/src/components/chat/ChatInput.tsx` | Lógica de grabación de voz (MediaRecorder) ya implementada |

### Brechas para cumplir las User Stories

| US | Brecha |
|---|---|
| US1 | Datos guardados solo en `localStorage` (Zustand persist) — sin base de datos ni API |
| US1 | Sin validación de placa única — el store no verifica duplicados |
| US2 | Form de repuestos en `MotorcycleCard` es solo texto — sin entrada por voz |
| US2 | Sin botón para eliminar un repuesto individual de la lista |

---

## User Story 1 — Registro de Motos

> Como mecánico, quiero registrar una moto usando su placa y modelo para tener un identificador único en el dashboard.

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
| `status` | Enum(`pending`, `finished`) | default `pending` |
| `created_at` | DateTime | auto |

**Tabla `parts`:**

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | UUID | PK |
| `motorcycle_id` | UUID | FK → motorcycles.id |
| `name` | String | NOT NULL |
| `quantity` | Integer | NOT NULL |

La columna `plate` lleva restricción `UNIQUE` a nivel de base de datos para garantizar unicidad desde la capa de datos.

---

### Paso 2 — Backend: endpoints REST de motocicletas

Crear `backend/workshop/router.py` y registrar en `backend/main.py`.

```
POST   /workshop/motorcycles                        Registrar moto
                                                    → 409 si placa duplicada
GET    /workshop/motorcycles                        Listar todas
                                                    → query param: ?status=pending|finished
PATCH  /workshop/motorcycles/{id}                   Actualizar datos de la moto
PATCH  /workshop/motorcycles/{id}/finish            Marcar como terminada
DELETE /workshop/motorcycles/{id}                   Eliminar registro
```

Todos los endpoints requieren JWT válido (mismo middleware que `chat/router.py`).

---

### Paso 3 — Backend: endpoints REST de repuestos

```
POST   /workshop/motorcycles/{id}/parts             Agregar repuesto
DELETE /workshop/motorcycles/{id}/parts/{part_id}   Eliminar repuesto
```

---

### Paso 4 — Frontend: migrar de Zustand local a TanStack Query

Reemplazar las acciones de `workshopStore` por queries y mutations de TanStack Query.

**Queries:**
```ts
useQuery(['workshop'])              // lista de motos desde el backend
useQuery(['workshop', id])          // detalle de una moto
```

**Mutations:**
```ts
useMutation → POST   /workshop/motorcycles
useMutation → PATCH  /workshop/motorcycles/{id}
useMutation → PATCH  /workshop/motorcycles/{id}/finish
useMutation → DELETE /workshop/motorcycles/{id}
```

`workshopStore` queda reducido a solo `activeRepairId` (estado UI puro, sin datos de servidor).

---

### Paso 5 — Frontend: validación de placa única

Cuando el backend responde `409 Conflict` al registrar una moto con placa duplicada, `ReceptionForm` muestra el error directamente en el campo de placa:

```
La placa ABC12D ya está registrada en el sistema.
```

El mensaje se limpia al modificar el campo.

**Archivos afectados:**
- `web/src/components/workshop/ReceptionForm.tsx`
- `web/src/store/workshopStore.ts` — simplificar, eliminar datos de servidor

---

## User Story 2 — Adición de Repuestos

> Como mecánico, quiero poder agregar repuestos a una moto (usando texto o voz) para que el requerimiento quede documentado.

### Paso 6 — Frontend: hook reutilizable de voz

`ChatInput.tsx` ya tiene la lógica completa de grabación (MediaRecorder + transcripción). Extraerla a un hook independiente para poder reutilizarla en el form de repuestos.

Crear `web/src/hooks/useVoiceRecorder.ts`:

```ts
// Expone:
{
  isRecording: boolean
  toggleRecording: () => void
  transcript: string      // texto transcrito listo para usar
  clearTranscript: () => void
}
```

El hook llama a `POST /api/transcribe` al detener la grabación (endpoint ya existente en el backend). El `transcript` se inyecta automáticamente en el campo de nombre del repuesto.

**Archivos afectados:**
- `web/src/hooks/useVoiceRecorder.ts` — nuevo
- `web/src/components/chat/ChatInput.tsx` — refactorizar para consumir el hook
- `web/src/components/workshop/MotorcycleCard.tsx` — agregar botón de voz al form de repuestos

**Comportamiento esperado en `MotorcycleCard`:**

```
[ Filtro de aceite       ] [ 1 ] [ 🎤 ] [ + ]
  ↑ texto o transcripción       ↑ voz  ↑ agregar
```

Al presionar el micrófono, el botón cambia a estado activo (rojo). Al detener, el texto transcrito se escribe en el campo de nombre. El mecánico puede ajustarlo antes de confirmar.

---

### Paso 7 — Frontend: eliminar repuesto individual

Agregar columna de acción en la tabla de repuestos de `MotorcycleCard`. El botón de eliminar llama al endpoint `DELETE /workshop/motorcycles/{id}/parts/{part_id}` e invalida la query `['workshop']` para refrescar la lista.

**Estado actual de la tabla:**

| Repuesto | Cant. |
|---|---|
| Filtro de aceite | 2 |

**Estado objetivo:**

| Repuesto | Cant. | |
|---|---|---|
| Filtro de aceite | 2 | 🗑 |

Solo visible cuando la moto está en estado `pending`.

**Archivos afectados:**
- `web/src/components/workshop/MotorcycleCard.tsx`

---

## Orden de ejecución

| # | Tarea | Capa | Depende de |
|---|---|---|---|
| 1 | Modelo SQLAlchemy + tablas `motorcycles` y `parts` | Backend | — |
| 2 | Endpoints CRUD `/workshop/motorcycles` | Backend | 1 |
| 3 | Endpoints CRUD `/workshop/motorcycles/{id}/parts` | Backend | 1 |
| 4 | Migrar frontend Zustand persist → TanStack Query | Frontend | 2 |
| 5 | Validación error 409 placa duplicada en `ReceptionForm` | Frontend | 4 |
| 6 | Hook `useVoiceRecorder` + voz en `MotorcycleCard` | Frontend | — |
| 7 | Botón eliminar repuesto individual | Frontend | 3, 4 |

Los pasos 1–5 (US1) y el paso 6 (US2, voz) son independientes entre sí y pueden trabajarse en paralelo.
