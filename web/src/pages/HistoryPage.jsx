import { History, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { historyService } from '@services/api'
import EmptyState from '@components/shared/EmptyState'

export default function HistoryPage() {
  const queryClient = useQueryClient()
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: historyService.list,
  })

  const deleteMutation = useMutation({
    mutationFn: historyService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['history'] }),
  })

  if (isLoading) return <div className="p-4">Cargando...</div>

  if (!conversations?.length) {
    return (
      <div className="p-4">
        <EmptyState
          icon={History}
          title="Sin historial"
          description="Aún no tienes conversaciones anteriores"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Historial de Conversaciones</h1>
      <div className="space-y-3">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="flex items-center justify-between rounded-xl border bg-white p-4"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{conv.title || 'Sin título'}</p>
              <p className="text-sm text-gray-500">
                {new Date(conv.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => deleteMutation.mutate(conv.id)}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
