/**
 * Zustand store for toast notification management.
 *
 * Maintains a queue of up to 3 toasts with auto-removal after a configurable duration.
 */
import { create } from 'zustand'

export const useToastStore = create((set, get) => ({
  toasts: [],
  addToast: (type, message, duration = 3500) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, type, message }] }))
    window.setTimeout(() => {
      get().removeToast(id)
    }, duration)
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
}))
