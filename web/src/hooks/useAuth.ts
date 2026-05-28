import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useToastStore } from '@store/toastStore'
import { authService } from '@services/api'
import { ApiError } from '@/lib/fetch'
import type { RegisterData } from '@types'

// Maps the role returned by the JWT to the correct landing route after login.
function roleRedirect(role: string): string {
  switch (role) {
    case 'mecanico': return '/chat'
    case 'secretario': return '/workshop'
    case 'admin': return '/chat'
    default: return '/workshop'
  }
}

// ── useLogin ──────────────────────────────────────────────────────────────────
// Calls POST /auth/login, stores the JWT and user in authStore on success,
// and redirects to the role-specific landing page.

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
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.detail : 'Error al iniciar sesión'
      addToast('error', msg)
    },
  })
}

// ── useRegister ───────────────────────────────────────────────────────────────
// Calls POST /auth/register (FastAPI backend) so that registration and login
// share the same database and the same bcrypt hashing algorithm.
// On success the user is redirected to /login to complete the flow.

export function useRegister() {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: () => {
      addToast('success', 'Cuenta creada. Ahora inicia sesión.')
      navigate('/login')
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.detail : 'Error al registrar.'
      addToast('error', msg)
    },
  })
}

// ── useLogout ─────────────────────────────────────────────────────────────────
// Clears the auth store (JWT + user) and redirects to the login page.

export function useLogout() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  return () => {
    logout()
    navigate('/login')
  }
}
