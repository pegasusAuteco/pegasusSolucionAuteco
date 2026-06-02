import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'

function defaultHomeForRole(role) {
  switch (role) {
    case 'mecanico':   return '/mechanic'
    case 'secretario': return '/workshop'
    case 'admin':      return '/workshop'
    default:           return '/login'
  }
}

export default function ProtectedRoute({ allowedRoles, redirectTo }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallback = redirectTo ?? defaultHomeForRole(user.role)
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
