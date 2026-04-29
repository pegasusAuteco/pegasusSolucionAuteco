import { Users, MessageSquare, BarChart3 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@services/api'

export default function AdminPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: analyticsService.adminStats,
  })

  if (isLoading) return <div className="p-4">Cargando...</div>

  if (!stats) {
    return <div className="p-4 text-gray-500">No hay datos disponibles</div>
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Panel de Administración</h1>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <Users className="mb-2 h-6 w-6 text-primary-500" />
          <p className="text-2xl font-bold">{stats.total_users}</p>
          <p className="text-xs text-gray-500">Usuarios</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <MessageSquare className="mb-2 h-6 w-6 text-primary-500" />
          <p className="text-2xl font-bold">{stats.total_conversations}</p>
          <p className="text-xs text-gray-500">Conversaciones</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <BarChart3 className="mb-2 h-6 w-6 text-primary-500" />
          <p className="text-2xl font-bold">{stats.total_messages}</p>
          <p className="text-xs text-gray-500">Mensajes</p>
        </div>
      </div>

      <h2 className="mb-4 font-semibold text-gray-700">Usuarios</h2>
      <div className="space-y-3">
        {stats.users.map((u, i) => (
          <div key={i} className="rounded-xl border bg-white p-4">
            <p className="font-medium">
              Usuario {i + 1}
            </p>
            <p className="text-sm text-gray-500">
              {u.total_conversations} conversaciones · {u.total_messages} mensajes
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
