import { apiFetch } from '../lib/fetch'

export const workshopService = {
  createIngreso: async (data) => {
    return apiFetch('/api/workshop/ingreso', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateIngreso: async (id, data) => {
    return apiFetch(`/api/workshop/ingreso/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  finishRepair: async (id) => {
    return apiFetch(`/api/workshop/ingreso/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ estado: 'completado' }),
    })
  },

  deleteIngreso: async (id) => {
    return apiFetch(`/api/workshop/ingreso/${id}`, {
      method: 'DELETE',
    })
  },

  getMotosMecanico: async () => {
    return apiFetch('/api/workshop/mechanic-queue')
  },

  notifyWhatsApp: async (id, parts = []) => {
    return apiFetch(`/api/workshop/motorcycles/${id}/whatsapp`, {
      method: 'POST',
      body: JSON.stringify({ parts })
    })
  },
}
