/**
 * Authentication hooks for login, registration, and logout.
 *
 * Uses React Query mutations for server state management and
 * Zustand store for client-side auth state persistence.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useToastStore } from '@store/toastStore'
import { authService } from '@services/api'

/**
 * Maps a user role to its default redirect path after login.
 *
 * @param {string} role - The user's role ('mecanico', 'secretario', or 'admin')
 * @returns {string} The route path to navigate to
 */
function roleRedirect(role) {
  switch (role) {
    case 'mecanico': return '/chat'
    case 'secretario': return '/workshop'
    case 'admin': return '/chat'
    default: return '/workshop'
  }
}

/**
 * Hook for logging in a user with email and password.
 *
 * Calls authService.login, stores user data in Zustand,
 * shows a welcome toast, and navigates to the role-appropriate page.
 *
 * @returns {UseMutationReturn} React Query mutation object.
 *   Call .mutate({ email, password }) to trigger login.
 */
export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: ({ email, password }) =>
      authService.login({ email, password }),
    onSuccess: ({ user }) => {
      setAuth(user)
      addToast('success', `Bienvenido, ${user.name} 👋`)
      navigate(roleRedirect(user.role))
    },
  })
}

/**
 * Hook for registering a new user account.
 *
 * Calls authService.register and redirects to /login on success.
 *
 * @returns {UseMutationReturn} React Query mutation object.
 *   Call .mutate({ nombre, email, password, rol }) to trigger registration.
 */
export function useRegister() {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: (data) => authService.register(data),
    onSuccess: () => {
      addToast('success', 'Cuenta creada. Ahora inicia sesión.')
      navigate('/login')
    },
  })
}

/**
 * Hook for logging out the current user.
 *
 * Clears auth state from Zustand, resets React Query cache,
 * and navigates to /login. Returns a function (not a mutation)
 * since logout is a synchronous local-only operation.
 *
 * @returns {Function} Call the returned function to log out.
 */
export function useLogout() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()

  return () => {
    logout()
    queryClient.clear()
    navigate('/login')
  }
}
