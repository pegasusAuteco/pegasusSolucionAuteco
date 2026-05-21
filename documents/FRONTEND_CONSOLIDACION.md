# Estrategia de Consolidación de Dependencias Frontend

> Objetivo: reducir de 10 a 5 dependencias manteniendo el mismo comportamiento, eliminando solapamientos y dando a cada herramienta un dominio único.

---

## Estado actual

| Herramienta | Rol actual | Problema |
|---|---|---|
| `axios` | Cliente HTTP con interceptores JWT | TanStack Query ya envuelve las llamadas; axios es un intermediario redundante |
| `TanStack Query` | Cache y estado de servidor | Solo gestiona parte del estado servidor; el resto vive en Zustand |
| `Zustand` | Estado cliente + estado servidor mezclados | `chatStore` duplica datos que TanStack Query ya cachea |
| `react-hook-form` | Estado de formularios | 3 formularios simples no justifican una librería dedicada |
| `zod` | Validación de esquemas | Separado de la gestión de formularios sin necesidad |
| `@hookform/resolvers` | Puente entre zod y react-hook-form | Solo existe para conectar las dos anteriores |
| `framer-motion` | Animaciones de montaje (fade, slide) | Tailwind CSS cubre estos casos nativamente |
| `date-fns` | Formateo de fechas (2 funciones) | La API `Intl` nativa de JS es suficiente |
| `clsx` + `tailwind-merge` | Condicionales CSS | Solo usados en `Navbar.tsx`; reemplazables con template literals |

---

## Estado objetivo

| Herramienta | Dominio único |
|---|---|
| `TanStack Query` | Todo el estado servidor + capa HTTP (via `fetch` nativo) |
| `Zustand` | Solo estado cliente puro (auth, UI, toasts) |
| `Zod` | Validación de formularios y esquemas de datos |
| `react-router-dom` | Routing |
| `lucide-react` | Iconografía |

```
10 dependencias → 5 dependencias
```

---

## Cambios por herramienta

### 1. TanStack Query absorbe a `axios`

**Situación actual**
`api.ts` crea una instancia de axios con dos interceptores:
- Request: inyecta `Authorization: Bearer <token>` desde `localStorage`
- Response: en 401, limpia token y redirige a `/login`

**Propuesta**
Reemplazar la instancia de axios por una función `apiFetch` con `fetch` nativo que replique los mismos interceptores. Los `queryFn` y `mutationFn` de TanStack Query la consumen directamente.

```ts
// src/lib/fetch.ts
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${import.meta.env.VITE_API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401 && !url.includes('/auth/login')) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

**Archivos afectados**
- `src/services/api.ts` — reescribir usando `apiFetch`
- `src/main.tsx` — eliminar `axios` del árbol de imports

---

### 2. TanStack Query y Zustand se reparten el estado sin solapamiento

**Situación actual**
`chatStore.ts` (Zustand) mantiene `conversations`, `currentConversation` y `messages` — los mismos datos que TanStack Query ya cachea con `useQuery(['conversations'])` y `useQuery(['messages', id])`.

**Propuesta**
Eliminar `chatStore`. Todo lo relacionado con datos del servidor vive en TanStack Query. Zustand queda solo para:

| Store | Contenido |
|---|---|
| `authStore` | `user`, `token`, `setUser`, `logout` |
| `toastStore` | Lista de toasts activos |

`workshopStore` se evalúa caso a caso: si sus datos vienen del backend, migrar a TanStack Query; si es estado UI local (formulario activo, paso del wizard), puede permanecer en Zustand o en `useState` local.

**Archivos afectados**
- `src/store/chatStore.ts` — eliminar
- `src/hooks/useChat.ts` — leer directamente de TanStack Query, sin `chatStore`
- `src/components/chat/ChatContainer.tsx` — ajustar imports

---

### 3. Zod absorbe a `react-hook-form` y `@hookform/resolvers`

**Situación actual**
`react-hook-form` gestiona el estado de 3 formularios simples:
- `LoginPage.tsx` — 2 campos: email, password
- `RegisterPage.tsx` — 4 campos: name, email, password, confirmPassword
- `ReceptionForm.tsx` — campos de registro de moto

Zod define el esquema de validación y `@hookform/resolvers` conecta ambas.

**Propuesta**
Reemplazar `react-hook-form` por `useState` para el estado del formulario y usar Zod directamente en el `onSubmit`:

```ts
// Antes (react-hook-form + zod)
const { register, handleSubmit, formState } = useForm<LoginForm>({
  resolver: zodResolver(loginSchema),
})

// Después (useState + zod)
const [form, setForm] = useState({ email: '', password: '' })
const [errors, setErrors] = useState<Record<string, string>>({})

function handleSubmit(e: FormEvent) {
  e.preventDefault()
  const result = loginSchema.safeParse(form)
  if (!result.success) {
    setErrors(result.error.flatten().fieldErrors)
    return
  }
  // ejecutar mutación
}
```

Zod sigue siendo la única fuente de verdad para las reglas de validación.

**Archivos afectados**
- `src/pages/LoginPage.tsx`
- `src/pages/RegisterPage.tsx`
- `src/components/workshop/ReceptionForm.tsx`
- `package.json` — eliminar `react-hook-form` y `@hookform/resolvers`

---

### 4. Tailwind absorbe a `framer-motion`

**Situación actual**
`framer-motion` se usa en 5 archivos con el mismo patrón:

```tsx
<motion.div
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: i * 0.1 }}
>
```

**Propuesta**
Tailwind CSS cubre esto con clases de animación. Para entradas secuenciales, se usa `style={{ animationDelay }}`:

```tsx
// Antes
<motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>

// Después
<div className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
```

Agregar en `tailwind.config.js`:
```js
theme: {
  extend: {
    keyframes: {
      'fade-in-up': {
        '0%':   { opacity: '0', transform: 'translateY(15px)' },
        '100%': { opacity: '1', transform: 'translateY(0)' },
      },
    },
    animation: {
      'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
    },
  },
}
```

**Archivos afectados**
- `src/components/chat/ChatBubble.tsx`
- `src/pages/AdminPage.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/RegisterPage.tsx`
- `src/components/inventory/MotorcycleCard.tsx`
- `web/tailwind.config.js`
- `package.json` — eliminar `framer-motion`

---

### 5. JS nativo absorbe a `date-fns`

**Situación actual**
Solo 2 funciones usadas en el módulo workshop:
- `format(date, 'dd/MM/yyyy')` en `ReceptionForm.tsx`
- `formatDistanceToNow(date, { locale: es })` en `MotorcycleCard.tsx`

**Propuesta**

```ts
// format(date, 'dd/MM/yyyy')
new Date(date).toLocaleDateString('es-CO')  // → "20/5/2026"

// formatDistanceToNow con locale es
new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  .format(-2, 'day')  // → "anteayer"
```

Para `formatDistanceToNow` se puede crear una utilidad de ~10 líneas en `src/utils/dates.ts` si se necesita el formato relativo exacto.

**Archivos afectados**
- `src/components/workshop/ReceptionForm.tsx`
- `src/components/workshop/MotorcycleCard.tsx`
- `package.json` — eliminar `date-fns`

---

### 6. Simplificar `clsx` + `tailwind-merge`

**Situación actual**
`cn()` de `src/utils/cn.ts` solo se llama en 2 lugares de `Navbar.tsx`.

**Propuesta**
Para 2 usos, no se justifican 2 librerías. Opciones:
- Usar template literals directamente
- O mantener solo `clsx` (sin `tailwind-merge`) si no hay conflictos de clases Tailwind

**Archivos afectados**
- `src/utils/cn.ts`
- `src/components/layout/Navbar.tsx`

---

## Orden de implementación sugerido

Cada paso es independiente y puede hacerse en PRs separados.

| Paso | Cambio | Riesgo |
|---|---|---|
| 1 | Eliminar `date-fns` → JS nativo | Bajo |
| 2 | Eliminar `framer-motion` → Tailwind keyframes | Bajo |
| 3 | Eliminar `clsx + tailwind-merge` → template literals | Bajo |
| 4 | Eliminar `axios` → `fetch` wrapper | Medio |
| 5 | Eliminar `react-hook-form + @hookform/resolvers` → `useState + zod` | Medio |
| 6 | Separar dominios Zustand / TanStack Query (eliminar `chatStore`) | Alto |

---

## Resultado esperado

| Métrica | Antes | Después |
|---|---|---|
| Dependencias de producción | 10 | 5 |
| Bundle size estimado | ~420KB | ~220KB |
| Herramientas con dominio único | No | Sí |
| Solapamiento de estado | Zustand + TanStack Query | Eliminado |
