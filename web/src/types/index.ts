// ─── Tipos de usuario y roles ─────────────────────────────────────────────────

export type UserRole = 'mecanico' | 'secretario' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  empresa_taller?: string | null
  created_at: string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

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

// ─── Chat / Mensajes ──────────────────────────────────────────────────────────

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

// ─── Analytics ────────────────────────────────────────────────────────────────

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

// ─── Workshop ─────────────────────────────────────────────────────────────────

export interface Part {
  id: string
  name: string
  quantity: number
}

export interface MotorcycleEntry {
  id: string
  clientName: string
  clientId: string
  email: string
  entryDate: string
  model: string
  plate: string
  mileage: number
  observations: string
  mechanicNotes?: string
  createdAt: string
  status: 'pending' | 'finished'
  parts: Part[]
}

// Raw shape returned by the backend (snake_case)
export interface MotorcycleEntryAPI {
  id: string
  client_name: string
  client_id: string
  email: string | null
  model: string
  plate: string
  mileage: number
  entry_date: string
  observations: string
  mechanic_notes: string | null
  status: 'pending' | 'finished'
  created_at: string
  updated_at: string
  parts: Array<{ id: string; motorcycle_id: string; name: string; quantity: number; created_at: string }>
}

export interface CreateMotorcycleData {
  client_name: string
  client_id: string
  email?: string
  model: string
  plate: string
  mileage: number
  entry_date: string
  observations: string
}

export interface UpdateMotorcycleData {
  client_name?: string
  client_id?: string
  email?: string
  model?: string
  mileage?: number
  observations?: string
  mechanic_notes?: string
}
