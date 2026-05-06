import React, { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react'
import { useLogin } from '@hooks/useAuth'
import { useAuthStore } from '@store/authStore'
import { Navigate, useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()

  if (isAuthenticated) return <Navigate to="/chat" replace />

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Por favor completa todos los campos.')
      return
    }

    let storedUsers = JSON.parse(localStorage.getItem('users') || '[]')
    
    // Ensure admin exists
    if (!storedUsers.some((u: any) => u.email === 'admin@pegasus.com')) {
      const defaultAdmin = { id: 'admin-1', name: 'Admin', email: 'admin@pegasus.com', password: 'admin', role: 'admin' }
      storedUsers.push(defaultAdmin)
      localStorage.setItem('users', JSON.stringify(storedUsers))
    }

    const user = storedUsers.find((u: any) => u.email === email && u.password === password)

    if (user) {
      setAuth(user, 'mock-jwt-token')
      navigate('/chat')
    } else {
      setError('Credenciales incorrectas. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="bg-auteco-red p-6 text-center">
          <img src="/logo.png" alt="Pegasus Mechanics" className="h-16 mx-auto object-contain drop-shadow-md mb-4 brightness-0 invert" />
          <h2 className="text-2xl font-bold text-white">Iniciar Sesión</h2>
          <p className="text-red-100 mt-2 text-sm">Accede al panel de control de Pegasus</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{error}</span>
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
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all sm:text-sm"
                  placeholder="admin@pegasus.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-auteco-red focus:border-auteco-red transition-all sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-auteco-red text-white py-3 px-4 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-auteco-red transition-all shadow-md hover:shadow-lg active:scale-95 font-medium"
          >
            Ingresar
            <ArrowRight className="w-4 h-4" />
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
      </motion.div>
    </div>
  )
}
