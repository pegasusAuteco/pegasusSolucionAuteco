import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useToastStore } from '@store/toastStore'
import { authService } from '@services/api'

function roleRedirect(role) {
  switch (role) {
    case 'mecanico': return '/chat'
    case 'secretario': return '/workshop'
    case 'admin': return '/chat'
    default: return '/workshop'
  }
}

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
