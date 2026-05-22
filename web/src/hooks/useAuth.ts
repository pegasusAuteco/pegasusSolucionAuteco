import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useToastStore } from '@store/toastStore'
import { supabaseAuthService, type UserRole } from '@services/supabaseAuthService'
import type { User } from '@types'

// ─── Destino de redirección por rol ──────────────────────────────────────────
function roleRedirect(role: UserRole): string {
  switch (role) {
    case 'mecanico':   return '/chat'
    case 'secretario': return '/workshop'
    case 'admin':      return '/chat'
    default:           return '/workshop'
  }
}

// ─── Mapea SupabaseUser → User (tipo interno) ─────────────────────────────────
function mapToUser(su: Awaited<ReturnType<typeof supabaseAuthService.login>>): User {
  return {
    id: String(su.id),
    email: su.email,
    name: su.nombre,
    role: su.rol,
    empresa_taller: su.empresa_taller,
    created_at: su.created_at,
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      supabaseAuthService.login(email, password),
    onSuccess: (supabaseUser) => {
      const user = mapToUser(supabaseUser)
      // Usamos un token UUID como marcador de sesión (no es JWT)
      const sessionToken = crypto.randomUUID()
      setAuth(user, sessionToken)
      addToast('success', `Bienvenido, ${user.name} 👋`)
      navigate(roleRedirect(user.role))
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: (data: {
      nombre: string
      email: string
      password: string
      rol: UserRole
      empresa_taller?: string
    }) => supabaseAuthService.register(data),
    onSuccess: () => {
      addToast('success', 'Cuenta creada. Ahora inicia sesión.')
      navigate('/login')
    },
  })
}

export function useLogout() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  return () => {
    logout()
    navigate('/login')
  }
}
