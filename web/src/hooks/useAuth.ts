import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useToastStore } from '@store/toastStore'
import { authService } from '@services/api'
import { supabaseAuthService, type UserRole } from '@services/supabaseAuthService'

// ─── Destino de redirección por rol ──────────────────────────────────────────
function roleRedirect(role: string): string {
  switch (role) {
    case 'mecanico':   return '/chat'
    case 'secretario': return '/workshop'
    case 'admin':      return '/chat'
    default:           return '/workshop'
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login({ email, password }),
    onSuccess: ({ user, access_token }) => {
      setAuth(user, access_token)
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
