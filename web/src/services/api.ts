import { apiFetch } from '../lib/fetch'
import type { AuthResponse, LoginCredentials, RegisterData, RegisterResponseData, Conversation, Message, UserStats, AdminStats } from '@types'

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
