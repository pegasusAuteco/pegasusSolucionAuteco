import { User, MessageSquare, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@services/api'
import { useAuthStore } from '@store/authStore'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const { data: stats, isLoading } = useQuery({
    queryKey: ['myStats'],
    queryFn: analyticsService.myStats,
  })

  if (!user) return null

  return (
    <div className="mx-auto max-w-lg p-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
          <User className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
        <p className="text-sm text-gray-500">{user.email}</p>
        <span className="mt-2 inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
          {user.role === 'admin' ? 'Administrador' : 'Empleado'}
        </span>
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-gray-500">Cargando estadísticas...</p>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-white p-4 text-center">
            <MessageSquare className="mx-auto mb-2 h-6 w-6 text-primary-500" />
            <p className="text-2xl font-bold text-gray-900">{stats.total_conversations}</p>
            <p className="text-xs text-gray-500">Conversaciones</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <MessageSquare className="mx-auto mb-2 h-6 w-6 text-primary-500" />
            <p className="text-2xl font-bold text-gray-900">{stats.total_messages}</p>
            <p className="text-xs text-gray-500">Mensajes</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <Calendar className="mx-auto mb-2 h-6 w-6 text-primary-500" />
            <p className="text-xs text-gray-500">Última actividad</p>
            <p className="text-xs text-gray-700">
              {new Date(stats.last_active).toLocaleDateString()}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
