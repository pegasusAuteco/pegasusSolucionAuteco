import { useState } from 'react'
import { z } from 'zod'
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { useLogin } from '@hooks/useAuth'
import { useAuthStore } from '@store/authStore'
import { useToastStore } from '@store/toastStore'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '@/lib/fetch'

// Client-side validation — only checks that fields are non-empty and well-formed.
// Credential correctness is validated by the backend.
const loginSchema = z.object({
  email: z.string().min(1, 'El email es requerido').email('Formato de email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()
  const loginMutation = useLogin()

  const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Stores the last submitted payload so the retry button can reuse it.
  const [retryPayload, setRetryPayload] = useState<LoginForm | null>(null)

  if (isAuthenticated) {
    const role = useAuthStore.getState().user?.role
    const dest = (role === 'mecanico' || role === 'admin') ? '/chat' : '/workshop'
    return <Navigate to={dest} replace />
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' })
    }
  }

  const onSubmit = async (e?: React.FormEvent, dataToSubmit?: LoginForm) => {
    if (e) e.preventDefault()

    const data = dataToSubmit || formData

    const result = loginSchema.safeParse(data)
    if (!result.success) {
      const formattedErrors: Record<string, string> = {}
      result.error.issues.forEach(issue => {
        formattedErrors[String(issue.path[0])] = issue.message
      })
      setErrors(formattedErrors)
      return
    }

    // Guard against submitting with no internet before hitting the backend.
    if (!navigator.onLine) {
      const message = 'Sin conexión. Verifica tu internet y vuelve a intentarlo.'
      setRetryPayload(data)
      setErrors({ root: message })
      addToast('error', message)
      return
    }

    // isPending from TanStack Query drives the disabled/spinner state — no local flag needed.
    try {
      await loginMutation.mutateAsync(data)
      setRetryPayload(null)
    } catch (err: unknown) {
      // status === 0 means no HTTP response was received (network failure).
      // Any other ApiError carries a meaningful HTTP status from the backend.
      const isNetworkError = err instanceof ApiError && err.status === 0
      const detail = err instanceof ApiError
        ? err.detail
        : 'No se pudo conectar con el servidor. Puedes reintentar.'
      setErrors({ root: detail })
      if (isNetworkError) {
        setRetryPayload(data)
        addToast('error', detail)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 transition-colors duration-300">
      <div className="animate-fade-in-up max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-auteco-red p-6 text-center">
          <img src="/logo.png" alt="Pegasus Mechanics" className="h-16 mx-auto object-contain drop-shadow-md mb-4 brightness-0 invert" />
          <h2 className="text-2xl font-bold text-white">Iniciar Sesión</h2>
          <p className="text-red-100 mt-2 text-sm">Accede al panel de control de Pegasus</p>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-6">
          {errors.root && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errors.root}</span>
              {retryPayload && (
                <button
                  type="button"
                  onClick={() => onSubmit(undefined, retryPayload)}
                  className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold hover:bg-red-100"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all sm:text-sm"
                  placeholder="admin@pegasus.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  type="password"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-auteco-red text-white py-3 px-4 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-auteco-red transition-all shadow-md hover:shadow-lg active:scale-95 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loginMutation.isPending ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                Ingresar
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            ¿No tienes cuenta?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-auteco-red hover:text-red-700 font-semibold transition-colors"
            >
              Regístrate aquí
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
