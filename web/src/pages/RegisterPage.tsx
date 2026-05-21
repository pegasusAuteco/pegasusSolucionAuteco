import { useState } from 'react'
import { z } from 'zod'

import { User, Mail, Lock, Building2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRegister } from '@hooks/useAuth'
import { useToastStore } from '@store/toastStore'

const registerSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es requerido').max(150, 'Máximo 150 caracteres'),
    email: z.string().min(1, 'El email es requerido').email('Formato de email inválido'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .max(12, 'Máximo 12 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[a-z]/, 'Debe contener al menos una minúscula')
      .regex(/\d/, 'Debe contener al menos un número'),
    confirmPassword: z.string().min(1, 'Debes confirmar la contraseña'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Debes aceptar los términos y condiciones' }),
    }),
    empresa_taller: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type RegisterForm = z.infer<typeof registerSchema>

type FormFields = {
  nombre: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
  empresa_taller: string
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegister()
  const addToast = useToastStore((s) => s.addToast)

  const [formData, setFormData] = useState<FormFields>({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    empresa_taller: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [retryPayload, setRetryPayload] = useState<FormFields | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' })
    }
  }

  const onSubmit = async (e?: React.FormEvent, dataToSubmit?: FormFields) => {
    if (e) e.preventDefault()

    const data = dataToSubmit || formData

    // Zod cross-field validation (includes refine for confirmPassword)
    const result = registerSchema.safeParse({
      ...data,
      acceptTerms: data.acceptTerms === true ? true : (data.acceptTerms as unknown),
    })
    if (!result.success) {
      const formattedErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const key = String(issue.path[0])
        if (!formattedErrors[key]) {
          formattedErrors[key] = issue.message
        }
      })
      setErrors(formattedErrors)
      return
    }

    if (!navigator.onLine) {
      const message = 'Sin conexión. Verifica tu internet y vuelve a intentarlo.'
      setRetryPayload(data)
      setErrors({ root: message })
      addToast('error', message)
      return
    }

    setIsSubmitting(true)
    try {
      await registerMutation.mutateAsync({
        nombre: data.nombre,
        email: data.email,
        password: data.password,
        accept_terms: true,
        empresa_taller: data.empresa_taller || undefined,
      })
      setRetryPayload(null)
    } catch (err: any) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail

      if (status === 409) {
        setErrors({ email: detail })
      } else if ((status === 400 || status === 422) && Array.isArray(detail)) {
        const fieldMap: Record<string, keyof RegisterForm> = {
          nombre: 'nombre',
          email: 'email',
          password: 'password',
          accept_terms: 'acceptTerms',
        }
        const newErrors: Record<string, string> = {}
        for (const e of detail) {
          const field = e.loc?.includes?.('body')
            ? fieldMap[e.loc[e.loc.length - 1]]
            : undefined
          if (field) {
            newErrors[field] = e.msg.replace('Value error, ', '')
          } else {
            newErrors.root = e.msg
          }
        }
        setErrors(newErrors)
      } else {
        const message = 'No se pudo conectar con el servidor. Puedes reintentar.'
        setRetryPayload(data)
        setErrors({ root: message })
        addToast('error', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 transition-colors duration-300">
      <div
        className="animate-fade-in-up max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="bg-gray-900 dark:bg-black p-6 text-center border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <User className="w-6 h-6 text-auteco-red" />
            Crear Cuenta
          </h2>
          <p className="text-gray-400 mt-2 text-sm">Únete a la plataforma Pegasus Mechanics</p>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-5">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all sm:text-sm"
                  placeholder="Juan Pérez"
                />
              </div>
              {errors.nombre && (
                <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>
              )}
            </div>

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
                  placeholder="juan@ejemplo.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
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
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  type="password"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa / Taller <span className="text-gray-400 font-normal">(opcional)</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="empresa_taller"
                  value={formData.empresa_taller}
                  onChange={handleChange}
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all sm:text-sm"
                  placeholder="Tu taller (ej. MotoCenter)"
                />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                type="checkbox"
                id="acceptTerms"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-auteco-red focus:ring-auteco-red"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-600 dark:text-gray-400">
                Acepto los términos y condiciones de la plataforma
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-red-500 text-xs mt-1">{errors.acceptTerms}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-3 px-4 rounded-xl hover:bg-black dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all shadow-md hover:shadow-lg active:scale-95 font-medium mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Registrarse'
            )}
          </button>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            ¿Ya tienes una cuenta?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-auteco-red hover:text-red-700 font-semibold transition-colors"
            >
              Inicia sesión
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}

