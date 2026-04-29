import axios from 'axios'
import type { AuthResponse, LoginCredentials, Conversation, Message, UserStats, AdminStats } from '@types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export const authService = {
  login: (credentials: LoginCredentials) =>
    api.post<AuthResponse>('/auth/login', credentials).then((r) => r.data),
  profile: () => api.get<{ user: import('@types').User }>('/auth/profile').then((r) => r.data.user),
}

export const chatService = {
  list: () => api.get<Conversation[]>('/chat/conversations').then((r) => r.data),
  create: (title?: string) =>
    api.post<Conversation>('/chat/conversations', { title }).then((r) => r.data),
  getMessages: (conversationId: string) =>
    api.get<Message[]>(`/chat/conversations/${conversationId}/messages`).then((r) => r.data),
  sendMessage: (conversationId: string, content: string) =>
    api.post<Message>(`/chat/conversations/${conversationId}/messages`, { content }).then((r) => r.data),
}

export const historyService = {
  list: () => api.get<Conversation[]>('/history').then((r) => r.data),
  get: (id: string) => api.get<Conversation>(`/history/${id}`).then((r) => r.data),
  delete: (id: string) => api.delete(`/history/${id}`),
}

export const analyticsService = {
  myStats: () => api.get<UserStats>('/analytics/me').then((r) => r.data),
  adminStats: () => api.get<AdminStats>('/analytics/admin').then((r) => r.data),
}

export default api
