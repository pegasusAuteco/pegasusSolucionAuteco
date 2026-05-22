import { supabase } from '../lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = 'mecanico' | 'secretario' | 'admin'

export interface SupabaseUser {
  id: number
  nombre: string
  email: string
  rol: UserRole
  empresa_taller?: string | null
  created_at: string
}

// ─── Utilidad: hashing con Web Crypto API (SHA-256) ──────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const supabaseAuthService = {
  /**
   * Inicia sesión comparando email + SHA-256(password) en la tabla usuarios.
   */
  login: async (email: string, password: string): Promise<SupabaseUser> => {
    const hashed = await hashPassword(password)

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, empresa_taller, created_at')
      .eq('email', email.toLowerCase().trim())
      .eq('password_hash', hashed)
      .single()

    if (error || !data) {
      throw new Error('Credenciales incorrectas. Verifica tu email y contraseña.')
    }

    return data as SupabaseUser
  },

  /**
   * Registra un nuevo usuario en la tabla usuarios con su rol asignado.
   * Solo permite registrar mecanico o secretario (el admin se asigna manualmente).
   */
  register: async (params: {
    nombre: string
    email: string
    password: string
    rol: UserRole
    empresa_taller?: string
  }): Promise<SupabaseUser> => {
    const hashed = await hashPassword(params.password)

    const { data, error } = await supabase
      .from('usuarios')
      .insert([
        {
          nombre: params.nombre,
          email: params.email.toLowerCase().trim(),
          password_hash: hashed,
          rol: params.rol,
          accept_terms: true,
          empresa_taller: params.empresa_taller || null,
        },
      ])
      .select('id, nombre, email, rol, empresa_taller, created_at')
      .single()

    if (error) {
      if (error.code === '23505') throw new Error('Este correo ya está registrado.')
      throw new Error(error.message)
    }

    return data as SupabaseUser
  },

  /**
   * Obtiene la lista de todos los usuarios (requerido para Admin Panel)
   */
  getAllUsers: async (): Promise<SupabaseUser[]> => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, empresa_taller, created_at')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data as SupabaseUser[]
  },

  /**
   * Actualiza el rol de un usuario existente (requerido para Admin Panel)
   */
  updateUserRole: async (userId: number, newRole: UserRole): Promise<void> => {
    const { error } = await supabase
      .from('usuarios')
      .update({ rol: newRole })
      .eq('id', userId)

    if (error) throw new Error(error.message)
  },
}
