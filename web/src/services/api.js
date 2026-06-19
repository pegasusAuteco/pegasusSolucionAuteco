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

export const adminService = {
  getUsers: () => apiFetch(`${baseURL}/admin/users`),
  updateRole: (userId, role) =>
    apiFetch(`${baseURL}/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  getCatalogManuals: () => apiFetch(`${baseURL}/admin/manuals`),
  deleteManual: async (name) => {
    const token = localStorage.getItem('jwt')
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const response = await fetch(`${baseURL}/admin/manuals/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.error || 'Error eliminando manual')
    }
    return response.json()
  },
  uploadManual: async (formData) => {
    // Para FormData NO enviamos el header Content-Type en apiFetch
    const token = localStorage.getItem('jwt')
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    
    const response = await fetch(`${baseURL}/admin/manuals`, {
      method: 'POST',
      headers,
      body: formData
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || errorData.error || 'Error en la petición')
    }
    return response.json()
  }
}
