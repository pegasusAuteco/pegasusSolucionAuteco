import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '@services/api'
import { useAuthStore } from '@store/authStore'
import type { LoginCredentials, RegisterData } from '@types'

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token)
      navigate('/chat')
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
    onSuccess: () => {
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
