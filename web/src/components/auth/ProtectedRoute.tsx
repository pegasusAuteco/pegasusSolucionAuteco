import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import type { UserRole } from '@types'

interface ProtectedRouteProps {
  /** Roles que tienen permitido acceder. Si no se especifica, cualquier usuario autenticado puede pasar. */
  allowedRoles?: UserRole[]
  /** Ruta de redirección si el rol no tiene acceso. Por defecto devuelve al home del rol. */
  redirectTo?: string
}

function defaultHomeForRole(role: UserRole | undefined): string {
  switch (role) {
    case 'mecanico':   return '/mechanic'
    case 'secretario': return '/workshop'
    case 'admin':      return '/workshop'
    default:           return '/login'
  }
}

export default function ProtectedRoute({ allowedRoles, redirectTo }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  // No autenticado → login
  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Verificar rol si se especificaron roles permitidos
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallback = redirectTo ?? defaultHomeForRole(user.role)
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
