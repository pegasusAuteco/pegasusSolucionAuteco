import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, History, User, LogOut, Shield } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useLogout } from '@hooks/useAuth'
import { cn } from '@utils/cn'

const navItems = [
  { path: '/chat', label: 'Chat', icon: MessageSquare },
  { path: '/history', label: 'Historial', icon: History },
  { path: '/profile', label: 'Perfil', icon: User },
]

export default function Navbar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white md:relative md:flex md:w-64 md:flex-col md:border-r md:border-t-0">
      <div className="hidden md:flex md:h-16 md:items-center md:px-6 md:font-bold md:text-lg">
        MotorConnect
      </div>
      <div className="flex justify-around md:flex-col md:space-y-1 md:p-4">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 text-xs md:flex-row md:text-sm md:rounded-lg',
              location.pathname === path
                ? 'text-primary-600 md:bg-primary-50'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 text-xs md:flex-row md:text-sm md:rounded-lg',
              location.pathname === '/admin'
                ? 'text-primary-600 md:bg-primary-50'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Shield className="h-5 w-5" />
            <span>Admin</span>
          </Link>
        )}
        <button
          onClick={logout}
          className="flex flex-col items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-red-600 md:flex-row md:text-sm md:rounded-lg md:mt-auto"
        >
          <LogOut className="h-5 w-5" />
          <span>Salir</span>
        </button>
      </div>
    </nav>
  )
}
