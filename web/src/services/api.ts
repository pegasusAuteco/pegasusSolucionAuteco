import { apiFetch } from '../lib/fetch'
import type {
  AuthResponse, LoginCredentials, RegisterData, RegisterResponseData,
  Conversation, Message, UserStats, AdminStats,
  MotorcycleEntry, MotorcycleEntryAPI, CreateMotorcycleData, UpdateMotorcycleData,
} from '@types'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export const authService = {
  login: (credentials: LoginCredentials) =>
    apiFetch<AuthResponse>(`${baseURL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  register: (data: RegisterData) =>
    apiFetch<RegisterResponseData>(`${baseURL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  profile: () => apiFetch<{ user: import('@types').User }>(`${baseURL}/auth/profile`).then((r) => r.user),
}

export const chatService = {
  list: () => apiFetch<Conversation[]>(`${baseURL}/chat/conversations`),
  create: (title?: string) =>
    apiFetch<Conversation>(`${baseURL}/chat/conversations`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  rename: (conversationId: string, title: string) =>
    apiFetch<Conversation>(`${baseURL}/chat/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
  remove: (conversationId: string) =>
    apiFetch<void>(`${baseURL}/chat/conversations/${conversationId}`, { method: 'DELETE' }),
  removeAll: () =>
    apiFetch<{ deleted: number }>(`${baseURL}/chat/conversations`, { method: 'DELETE' }),
  getMessages: (conversationId: string) =>
    apiFetch<Message[]>(`${baseURL}/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, content: string) =>
    apiFetch<Message>(`${baseURL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
}

export const historyService = {
  list: () => apiFetch<Conversation[]>(`${baseURL}/history`),
  get: (id: string) => apiFetch<Conversation>(`${baseURL}/history/${id}`),
  delete: (id: string) => apiFetch<void>(`${baseURL}/history/${id}`, { method: 'DELETE' }),
}

export const analyticsService = {
  myStats: () => apiFetch<UserStats>(`${baseURL}/analytics/me`),
  adminStats: () => apiFetch<AdminStats>(`${baseURL}/analytics/admin`),
}

// ─── Workshop ─────────────────────────────────────────────────────────────────

function mapMotorcycle(m: MotorcycleEntryAPI): MotorcycleEntry {
  return {
    id: m.id,
    clientName: m.client_name,
    clientId: m.client_id,
    email: m.email ?? '',
    entryDate: m.entry_date,
    model: m.model,
    plate: m.plate,
    mileage: m.mileage,
    observations: m.observations,
    mechanicNotes: m.mechanic_notes ?? undefined,
    createdAt: m.created_at,
    status: m.status,
    parts: m.parts.map((p) => ({ id: p.id, name: p.name, quantity: p.quantity })),
  }
}

export const workshopService = {
  list: (status?: 'pending' | 'finished') => {
    const url = status
      ? `${baseURL}/workshop/motorcycles?status=${status}`
      : `${baseURL}/workshop/motorcycles`
    return apiFetch<MotorcycleEntryAPI[]>(url).then((items) => items.map(mapMotorcycle))
  },

  create: (data: CreateMotorcycleData) =>
    apiFetch<MotorcycleEntryAPI>(`${baseURL}/workshop/motorcycles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(mapMotorcycle),

  update: (id: string, data: UpdateMotorcycleData) =>
    apiFetch<MotorcycleEntryAPI>(`${baseURL}/workshop/motorcycles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(mapMotorcycle),

  finish: (id: string) =>
    apiFetch<MotorcycleEntryAPI>(`${baseURL}/workshop/motorcycles/${id}/finish`, {
      method: 'PATCH',
    }).then(mapMotorcycle),

  remove: (id: string) =>
    apiFetch<void>(`${baseURL}/workshop/motorcycles/${id}`, { method: 'DELETE' }),

  addPart: (motorcycleId: string, part: { name: string; quantity: number }) =>
    apiFetch<{ id: string; name: string; quantity: number }>(
      `${baseURL}/workshop/motorcycles/${motorcycleId}/parts`,
      { method: 'POST', body: JSON.stringify(part) },
    ),

  removePart: (motorcycleId: string, partId: string) =>
    apiFetch<void>(
      `${baseURL}/workshop/motorcycles/${motorcycleId}/parts/${partId}`,
      { method: 'DELETE' },
    ),
}
