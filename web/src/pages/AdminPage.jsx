import { useState } from 'react'
import { Users, MessageSquare, Activity, FilePlus2, Upload, X, Construction, Zap, Shield } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsService, adminService } from '@services/api'
import { useToastStore } from '@store/toastStore'

export default function AdminPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [newManual, setNewManual] = useState({ name: '', image: null, pdf: null })

  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: analyticsService.adminStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const queryClient = useQueryClient()
  const addToast = useToastStore(s => s.addToast)

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: adminService.getUsers,
  })

  const { data: dbManuals, isLoading: isLoadingManuals } = useQuery({
    queryKey: ['catalogManuals'],
    queryFn: adminService.getCatalogManuals,
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => adminService.updateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers'])
      addToast('success', 'Rol actualizado correctamente')
    },
    onError: (err) => {
      addToast('error', `Error al actualizar rol: ${err.message}`)
    }
  })

  const handleRoleChange = (userId, newRole) => {
    updateRoleMutation.mutate({ userId, role: newRole })
  }

  const uploadManualMutation = useMutation({
    mutationFn: (formData) => adminService.uploadManual(formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['catalogManuals'])
      setIsUploadModalOpen(false)
      setNewManual({ name: '', image: null, pdf: null })
      addToast('success', 'Manual subido e indexado correctamente')
    },
    onError: (err) => {
      addToast('error', `Error subiendo manual: ${err.message}`)
    }
  })

  const handleUploadManual = () => {
    if (newManual.name && newManual.pdf) {
      const formData = new FormData()
      formData.append('name', newManual.name)
      formData.append('pdf', newManual.pdf)
      if (newManual.image) {
        formData.append('image', newManual.image)
      }
      uploadManualMutation.mutate(formData)
    }
  }

  // Filtrar para mostrar solo los manuales nuevos (los que tienen imagen asociada)
  const validDbManuals = (dbManuals || []).filter(manual => manual.image)

  const displayMetrics = [
    { label: 'Usuarios Activos', value: stats?.total_users || '0', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Conversaciones', value: stats?.total_conversations || '0', icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Mensajes', value: stats?.total_messages || '0', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { label: 'Manuales', value: validDbManuals.length.toString(), icon: FilePlus2, color: 'text-auteco-red', bg: 'bg-red-50 dark:bg-red-900/20' },
  ]

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6 w-full pb-24 animate-pulse">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
            <div className="h-4 w-64 bg-gray-100 dark:bg-gray-800/50 rounded"></div>
          </div>
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
        </div>
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl mb-6 border border-gray-100 dark:border-gray-700/50"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-100 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 w-full pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-auteco-blue dark:text-gray-100 tracking-tight">MÉTRICAS</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Panel exclusivo de administración</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 px-3 py-1.5 rounded-full text-xs font-semibold">
          <Construction className="w-3.5 h-3.5" />
          En proceso
        </div>
      </div>

      <div className="animate-fade-in-up relative overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800 dark:from-auteco-red/20 dark:to-gray-900 rounded-2xl p-5 mb-6 border border-gray-200 dark:border-auteco-red/30">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-auteco-red/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-auteco-red/20 dark:bg-auteco-red/30 rounded-xl">
            <Zap className="w-6 h-6 text-auteco-red" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Sistema de Análisis en Desarrollo</p>
            <p className="text-gray-400 text-xs mt-0.5">Las métricas en tiempo real estarán disponibles en la próxima versión de la plataforma.</p>
          </div>
        </div>
        <div className="mt-4 w-full bg-gray-700 rounded-full h-1.5 relative z-10">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-auteco-red to-orange-400 w-[62%]" />
        </div>
        <p className="text-right text-xs text-gray-500 mt-1 relative z-10">62% completado</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {displayMetrics.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              style={{ animationDelay: `${i * 100}ms` }}
              className="animate-fade-in-up relative bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-xl p-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div style={{ animationDelay: '700ms' }} className="animate-fade-in-up bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-auteco-red" />
            Manuales de Motos
          </h3>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 bg-auteco-red text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-all active:scale-95 shadow-md"
          >
            <Upload className="w-4 h-4" />
            Añadir Manual
          </button>
        </div>

        <div className="space-y-2">
          {isLoadingManuals ? (
            <div className="py-4 flex justify-center"><div className="animate-spin h-5 w-5 border-b-2 border-auteco-red rounded-full"></div></div>
          ) : (
            validDbManuals.map((manual, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50 group hover:border-auteco-red/40 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  {manual.image ? (
                    <img src={manual.image} alt={manual.name} className="shrink-0 w-10 h-10 object-cover rounded-lg shadow-sm border border-gray-200 dark:border-gray-700" />
                  ) : (
                    <div className="shrink-0 w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center border border-red-100 dark:border-red-900/50">
                      <FilePlus2 className="w-5 h-5 text-auteco-red" />
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{manual.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Indexado · Disponible en Chatbot</p>
                  </div>
                </div>
              </div>
            ))
          )}
          {!isLoadingManuals && validDbManuals.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">No hay manuales nuevos cargados aún.</p>
          )}
        </div>
      </div>

      {/* Gestión de Usuarios */}
      <div style={{ animationDelay: '800ms' }} className="animate-fade-in-up mt-6 bg-white dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
            <Shield className="w-5 h-5 text-auteco-blue dark:text-blue-400" />
            Gestión de Usuarios
          </h3>
        </div>

        {isLoadingUsers ? (
          <div className="py-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-auteco-blue"></div>
          </div>
        ) : (
          <div className="overflow-x-auto bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
            <table className="w-full text-sm text-left">
              <thead className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3 text-right">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {usersData?.map((u) => (
                  <tr key={u.id} className="hover:bg-white dark:hover:bg-gray-800/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={updateRoleMutation.isPending}
                        className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg focus:ring-auteco-blue focus:border-auteco-blue block w-full p-1.5 outline-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="employee">Empleado</option>
                        <option value="admin">Administrador</option>
                        <option value="mecanico">Mecánico</option>
                        <option value="secretario">Secretario</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {(!usersData || usersData.length === 0) && (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-gray-400">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Añadir Manual */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Upload className="w-5 h-5 text-auteco-red" />
                Añadir Nuevo Manual
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Nombre de la Moto <span className="text-auteco-red">*</span></label>
                <input 
                  type="text" 
                  value={newManual.name}
                  onChange={(e) => setNewManual({...newManual, name: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-auteco-red focus:bg-white dark:focus:bg-gray-900 outline-none transition-all shadow-sm"
                  placeholder="Ej: Boxer CT 100"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Imagen de la Moto <span className="text-gray-400 font-normal text-xs">(Opcional)</span></label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setNewManual({...newManual, image: e.target.files?.[0]})}
                  className="w-full text-sm text-gray-500 file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 dark:file:bg-gray-800 dark:file:text-gray-300 dark:hover:file:bg-gray-700 transition-colors border border-dashed border-gray-300 dark:border-gray-700 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Manual PDF <span className="text-auteco-red">*</span></label>
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={(e) => setNewManual({...newManual, pdf: e.target.files?.[0]})}
                  className="w-full text-sm text-gray-500 file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-red-50 file:text-auteco-red hover:file:bg-red-100 dark:file:bg-red-900/20 dark:hover:file:bg-red-900/40 transition-colors border border-dashed border-red-200 dark:border-red-900/50 p-2 rounded-xl bg-red-50/30 dark:bg-red-900/10"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors shadow-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                Cancelar
              </button>
              <button 
                disabled={!newManual.name || !newManual.pdf || uploadManualMutation.isPending}
                onClick={handleUploadManual}
                className="px-4 py-2 text-sm font-bold bg-auteco-red text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                {uploadManualMutation.isPending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {uploadManualMutation.isPending ? 'Procesando PDF...' : 'Guardar Manual'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
