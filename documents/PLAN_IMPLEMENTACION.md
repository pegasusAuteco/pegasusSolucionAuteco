# Plan de Implementación — User Stories Workshop

> Basado en `UserStory.md`. La tarea "Prev" (apartado visual) está completada.
> Este documento cubre las dos User Stories pendientes de funcionalidad real.
> **Última revisión:** 2026-05-21 — actualizado tras consolidación del frontend en `feature/motoRegist`.

---

## Contexto: estado actual del frontend

### Lo que ya existe

| Archivo | Qué hace |
|---|---|
| `web/src/components/workshop/ReceptionForm.tsx` | Formulario completo: placa, modelo, cliente, km, observaciones; admite `initialData` para edición |
| `web/src/components/workshop/MotorcycleCard.tsx` | Card con form de repuestos por texto, botón eliminar repuesto (**✓ implementado**), acciones editar/finalizar |
| `web/src/components/workshop/MechanicDashboard.tsx` | Cola de motos con tabs "En Reparación" / "Listos para Entregar" |
| `web/src/components/workshop/CompactMechanicQueue.tsx` | Vista compacta de la cola: lista de espera + panel de reparación activa con notas del mecánico |
| `web/src/components/workshop/InvoiceModal.tsx` | Modal de factura de servicio con desglose de labor + repuestos (costos ficticios por ahora) |
| `web/src/pages/WorkshopPage.tsx` | Página con tabs Recepción / Equipo Técnico |
| `web/src/contexts/WorkshopContext.tsx` | Estado global del taller: `queue`, `registerEntry`, `addPartToEntry`, `removePartFromEntry`, `finishRepair`, etc. Persiste en `localStorage`. |
| `web/src/hooks/useWorkshop.ts` | Hook que expone el contexto del taller; re-exporta tipos `MotorcycleEntry`, `Part` |
| `web/src/components/chat/ChatInput.tsx` | Lógica de grabación de voz (MediaRecorder) ya implementada |

> **Nota:** `web/src/store/workshopStore.ts` fue eliminado. El estado del taller migró de Zustand a Context API (`WorkshopContext.tsx`). Los datos siguen persistiendo en `localStorage`.

### Brechas para cumplir las User Stories

| US | Brecha | Estado |
|---|---|---|
| US1 | Datos guardados solo en `localStorage` (Context persist) — sin base de datos ni API | Pendiente |
| US1 | Sin validación de placa única — el contexto no verifica duplicados | Pendiente |
| US2 | Form de repuestos en `MotorcycleCard` es solo texto — sin entrada por voz | Pendiente |
| US2 | Botón para eliminar repuesto individual | **✓ Implementado** |

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

### Paso 4 — Frontend: migrar de Context + localStorage a TanStack Query

Reemplazar las acciones de `WorkshopContext` por queries y mutations de TanStack Query. El contexto ya no usa Zustand — el estado vive en `WorkshopContext.tsx` con `localStorage`.

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

`WorkshopContext` queda reducido a solo `activeRepairId` (estado UI puro, sin datos de servidor).

---

### Paso 5 — Frontend: validación de placa única

Cuando el backend responde `409 Conflict` al registrar una moto con placa duplicada, `ReceptionForm` muestra el error directamente en el campo de placa:

```
La placa ABC12D ya está registrada en el sistema.
```

El mensaje se limpia al modificar el campo.

**Archivos afectados:**
- `web/src/components/workshop/ReceptionForm.tsx`
- `web/src/contexts/WorkshopContext.tsx` — simplificar, eliminar datos de servidor (lógica de estado local)

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

### Paso 7 — Frontend: eliminar repuesto individual ✓ COMPLETADO

Ya implementado en `MotorcycleCard.tsx` (icono `Trash2`) y `CompactMechanicQueue.tsx` (vista activa). Ambos llaman a `removePartFromEntry` del contexto.

**Pendiente al conectar con backend:** reemplazar la llamada al contexto por `DELETE /workshop/motorcycles/{id}/parts/{part_id}` e invalidar la query `['workshop']`.

**Archivos afectados (cuando se conecte al backend):**
- `web/src/components/workshop/MotorcycleCard.tsx`
- `web/src/components/workshop/CompactMechanicQueue.tsx`

---

## Orden de ejecución

| # | Tarea | Capa | Depende de | Estado |
|---|---|---|---|---|
| 1 | Modelo SQLAlchemy + tablas `motorcycles` y `parts` | Backend | — | Pendiente |
| 2 | Endpoints CRUD `/workshop/motorcycles` | Backend | 1 | Pendiente |
| 3 | Endpoints CRUD `/workshop/motorcycles/{id}/parts` | Backend | 1 | Pendiente |
| 4 | Migrar frontend Context + localStorage → TanStack Query | Frontend | 2 | Pendiente |
| 5 | Validación error 409 placa duplicada en `ReceptionForm` | Frontend | 4 | Pendiente |
| 6 | Hook `useVoiceRecorder` + voz en `MotorcycleCard` | Frontend | — | Pendiente |
| 7 | Botón eliminar repuesto individual | Frontend | — | **✓ Hecho** |

Los pasos 1–5 (US1) y el paso 6 (US2, voz) son independientes entre sí y pueden trabajarse en paralelo.

---

## Componentes existentes no previstos en el plan original

Estos componentes fueron agregados durante la consolidación del frontend y deben considerarse en la integración con el backend:

| Componente | Descripción | Impacto al conectar al backend |
|---|---|---|
| `InvoiceModal.tsx` | Modal de factura con costos ficticios (labor fijo + precio fijo por repuesto) | Reemplazar constantes por precios reales del backend cuando existan |
| `CompactMechanicQueue.tsx` | Vista compacta para el mecánico activo: panel de reparación + notas + repuestos | Conectar `addPartToEntry` / `removePartFromEntry` a los endpoints de partes |
