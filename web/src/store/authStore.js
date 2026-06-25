/**
 * Zustand store for authentication state management.
 *
 * Persists user data in localStorage and provides actions for
 * login (setAuth), logout, and user updates.
 */
import { create } from 'zustand'

const storedUser = localStorage.getItem('auth_user')

export const useAuthStore = create((set) => ({
  user: storedUser ? JSON.parse(storedUser) : null,
  isAuthenticated: !!storedUser,
  setAuth: (user) => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('auth_user')
    set({ user: null, isAuthenticated: false })
  },
  setUser: (user) => set({ user }),
}))
