# Pegasus — Frontend

Interfaz web mobile-first para el taller **Pegasus Mechanics / Auteco**. Construida con React 18 + TypeScript + Vite + Tailwind CSS.

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| Node.js | 18.x o superior |
| npm | 9.x o superior |

---

## Instalación y puesta en marcha

```bash
# Desde la raíz del repositorio
cd web
npm install
npm run dev        # http://localhost:5174
```

---

## Dependencias de producción

| Paquete | Dominio |
|---------|---------|
| `react` + `react-dom` | UI |
| `react-router-dom` | Routing |
| `@tanstack/react-query` | Estado servidor + caché HTTP |
| `zustand` | Estado cliente puro (auth, toasts) |
| `zod` | Validación de formularios y esquemas |
| `@supabase/supabase-js` | Acceso directo a Supabase desde el cliente |
| `lucide-react` | Iconografía |

> HTTP se realiza con `fetch` nativo a través de `src/lib/fetch.ts` (`apiFetch`). No se usa axios.

---

## Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot-reload en :5174 |
| `npm run build` | Bundle de producción → `dist/` |
| `npm run preview` | Previsualiza el build de producción |
| `npm run lint` | ESLint + reporte de errores |
| `npm run type-check` | Verificación de tipos TypeScript sin emitir |
| `npm run format` | Prettier sobre `src/**` |

---

## Estructura del proyecto

```
web/src/
├── components/
│   ├── auth/           # ProtectedRoute (guard por rol)
│   ├── chat/           # ChatContainer, ChatBubble, ChatInput
│   ├── inventory/      # MotorcycleCard, MotorcycleList
│   ├── layout/         # Layout, Navbar
│   ├── shared/         # EmptyState, ToastViewport
│   └── workshop/       # ReceptionForm, MechanicDashboard, MotorcycleCard,
│                       # CompactMechanicQueue, InvoiceModal
├── contexts/           # ChatContext, WorkshopContext
├── hooks/              # useAuth, useChat, useChatUI, useWorkshop
├── lib/
│   ├── fetch.ts        # apiFetch — wrapper fetch nativo con JWT e interceptor 401
│   └── supabase.ts     # Cliente Supabase
├── pages/              # LoginPage, RegisterPage, ChatPage, WorkshopPage,
│                       # MechanicPage, HistoryPage, ProfilePage, AdminPage
├── services/
│   ├── api.ts          # authService, chatService, historyService, analyticsService
│   ├── workshopService.ts  # CRUD motos en Supabase
│   └── supabaseAuthService.ts
├── store/
│   ├── authStore.ts    # Zustand: user + token
│   └── toastStore.ts   # Zustand: notificaciones
├── types/              # index.ts — interfaces globales
└── utils/
    └── dates.ts        # getLocalISODate, formatRelativeTime (sin date-fns)
```

---

## Animaciones

Tailwind CSS gestiona todas las animaciones. La clase `animate-fade-in-up` (keyframe definido en `tailwind.config.js`) reemplaza framer-motion:

```tsx
<div className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
```

---

## Notas de arquitectura

- **Estado servidor** → TanStack Query (`useConversations`, `useMessages`, `useSendMessage`, etc.)
- **Estado cliente** → Zustand solo para `authStore` y `toastStore`
- **Formularios** → `useState` + `zod.safeParse` directo (sin react-hook-form)
- **Fechas** → API `Intl` nativa del navegador (sin date-fns)
- **Clases condicionales** → template literals de JS (sin clsx/tailwind-merge)
