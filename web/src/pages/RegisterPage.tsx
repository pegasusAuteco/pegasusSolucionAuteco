import { useState } from 'react'
import { z } from 'zod'
import { User, Mail, Lock, Building2, AlertCircle, Wrench, ClipboardList, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRegister } from '@hooks/useAuth'
import { useToastStore } from '@store/toastStore'
import { ApiError } from '@/lib/fetch'
import type { UserRole } from '@types'

// Validation schema — mirrors the constraints enforced by the backend RegisterRequest.
// Password rules (8–12 chars, upper, lower, digit) must stay in sync with backend/auth/schemas.py.
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
    // Only mecanico and secretario can self-register; admin is assigned manually.
    rol: z.enum(['mecanico', 'secretario'] as const, {
      errorMap: () => ({ message: 'Selecciona un rol válido' }),
    }),
    empresa_taller: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })


const ROLE_OPTIONS: { value: UserRole; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'mecanico',
    label: 'Mecánico',
    icon: <Wrench className="w-5 h-5" />,
    description: 'Accede a la cola de reparaciones',
  },
  {
    value: 'secretario',
    label: 'Secretario',
    icon: <ClipboardList className="w-5 h-5" />,
    description: 'Gestiona el ingreso de motos',
  },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const registerMutation = useRegister()
  const addToast = useToastStore((s) => s.addToast)

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol: '' as UserRole | '',
    empresa_taller: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' })
  }

  const selectRole = (role: UserRole) => {
    setFormData({ ...formData, rol: role })
    if (errors.rol) setErrors({ ...errors, rol: '' })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = registerSchema.safeParse(formData)
    if (!result.success) {
      const formattedErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const key = String(issue.path[0])
        if (!formattedErrors[key]) formattedErrors[key] = issue.message
      })
      setErrors(formattedErrors)
      return
    }

    // isPending from TanStack Query drives the disabled/spinner state — no local flag needed.
    try {
      await registerMutation.mutateAsync({
        nombre: result.data.nombre,
        email: result.data.email,
        password: result.data.password,
        rol: result.data.rol,
        accept_terms: true,
        empresa_taller: result.data.empresa_taller || undefined,
      })
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : 'Error al registrar. Intenta de nuevo.'
      // HTTP 409 means the email is already registered — surface it on the email field.
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: msg })
      } else {
        setErrors({ root: msg })
        addToast('error', msg)
      }
    }
  }

  const inputClass = (field: string) =>
    `block w-full pl-10 pr-3 py-2.5 border ${
      errors[field] ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
    } rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all sm:text-sm`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 transition-colors duration-300">
      <div className="animate-fade-in-up max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 dark:bg-black p-6 text-center border-b border-gray-800">
          <div className="w-14 h-14 bg-auteco-red rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Crear Cuenta</h2>
          <p className="text-gray-400 mt-1 text-sm">Únete a la plataforma Pegasus Mechanics</p>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-5">
          {errors.root && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.root}</span>
            </div>
          )}

          {/* Selector de rol */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Rol en el taller
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectRole(opt.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                    formData.rol === opt.value
                      ? 'border-auteco-red bg-red-50 dark:bg-red-900/20 text-auteco-red'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {opt.icon}
                  <span className="font-bold text-sm">{opt.label}</span>
                  <span className="text-xs leading-tight">{opt.description}</span>
                </button>
              ))}
            </div>
            {errors.rol && <p className="text-red-500 text-xs mt-1">{errors.rol}</p>}
          </div>

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  type="text"
                  className={inputClass('nombre')}
                  placeholder="Juan Pérez"
                />
              </div>
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  className={inputClass('email')}
                  placeholder="juan@ejemplo.com"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  type="password"
                  className={inputClass('password')}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  type="password"
                  className={inputClass('confirmPassword')}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Empresa / Taller */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Empresa / Taller{' '}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  name="empresa_taller"
                  value={formData.empresa_taller}
                  onChange={handleChange}
                  type="text"
                  className={inputClass('empresa_taller')}
                  placeholder="Pegasus Auteco"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white py-3 px-4 rounded-xl hover:bg-black dark:hover:bg-gray-100 transition-all shadow-md hover:shadow-lg active:scale-95 font-semibold mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {registerMutation.isPending ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Crear Cuenta'
            )}
          </button>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            ¿Ya tienes cuenta?{' '}
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
