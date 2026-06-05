import { apiFetch } from '../lib/fetch'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export const authService = {
  login: (credentials) =>
    apiFetch(`${baseURL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  register: (data) =>
    apiFetch(`${baseURL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  profile: () => apiFetch(`${baseURL}/auth/profile`).then((r) => r.user),
}

export const chatService = {
  list: () => apiFetch(`${baseURL}/chat/conversations`),
  create: (title) =>
    apiFetch(`${baseURL}/chat/conversations`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  rename: (conversationId, title) =>
    apiFetch(`${baseURL}/chat/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
  remove: (conversationId) =>
    apiFetch(`${baseURL}/chat/conversations/${conversationId}`, { method: 'DELETE' }),
  removeAll: () =>
    apiFetch(`${baseURL}/chat/conversations`, { method: 'DELETE' }),
  getMessages: (conversationId) =>
    apiFetch(`${baseURL}/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, content) => {
    return apiFetch(`${baseURL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
      timeout: 120_000,
    })
  },
  sendVoice: (audioBlob, conversationId = null) => {
    const form = new FormData()
    form.append('audio', audioBlob, 'audio.webm')
    if (conversationId) form.append('conversation_id', conversationId)
    return apiFetch(`${baseURL}/voice/transcribe`, {
      method: 'POST',
      body: form,
      timeout: 90_000,
    })
  },
}

export const historyService = {
  list: () => apiFetch(`${baseURL}/history`),
  get: (id) => apiFetch(`${baseURL}/history/${id}`),
  delete: (id) => apiFetch(`${baseURL}/history/${id}`, { method: 'DELETE' }),
}

export const analyticsService = {
  myStats: () => apiFetch(`${baseURL}/analytics/me`),
  adminStats: () => apiFetch(`${baseURL}/analytics/admin`),
}
