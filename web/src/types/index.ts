export interface User {
  id: string
  email: string
  name: string
  role: 'employee' | 'admin'
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  nombre: string
  email: string
  password: string
  accept_terms: boolean
  empresa_taller?: string
}

export interface RegisterResponseData {
  id: number
  nombre: string
  email: string
  rol: string
  empresa_taller?: string
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Conversation {
  id: string
  title: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface UserStats {
  total_conversations: number
  total_messages: number
  last_active: string
}

export interface AdminStats {
  total_users: number
  total_conversations: number
  total_messages: number
  users: UserStats[]
}
