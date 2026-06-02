import { apiFetch } from '../lib/fetch'

export const workshopService = {
  createIngreso: async (data) => {
    await apiFetch('/api/workshop/ingreso', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  getMotosMecanico: async () => {
    return apiFetch('/api/workshop/mechanic-queue')
  },
}
