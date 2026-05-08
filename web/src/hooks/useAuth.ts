import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '@services/api'
import { useAuthStore } from '@store/authStore'
import { useToastStore } from '@store/toastStore'
import type { LoginCredentials, RegisterData } from '@types'

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token)
      addToast('success', `Bienvenido, ${data.user.name}`)
      navigate('/chat')
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  return useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: () => {
      addToast('success', 'Registro exitoso. Ahora inicia sesión.')
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
