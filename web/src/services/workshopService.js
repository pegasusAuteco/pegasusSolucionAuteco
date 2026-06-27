/**
 * Workshop service for managing motorcycle intake records via the BFF.
 *
 * Provides CRUD operations for workshop entries and WhatsApp notifications.
 */
import { apiFetch } from '../lib/fetch'

export const workshopService = {
  /** Create a new workshop intake record. */
  createIngreso: async (data) => {
    return apiFetch('/api/workshop/ingreso', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /** Update an existing workshop intake record. */
  updateIngreso: async (id, data) => {
    return apiFetch(`/api/workshop/ingreso/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /** Mark a repair as completed. */
  finishRepair: async (id) => {
    return apiFetch(`/api/workshop/ingreso/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ estado: 'completado' }),
    })
  },

  /** Delete a workshop intake record. */
  deleteIngreso: async (id) => {
    return apiFetch(`/api/workshop/ingreso/${id}`, {
      method: 'DELETE',
    })
  },

  /** Fetch the mechanic's assigned motorcycle queue. */
  getMotosMecanico: async () => {
    return apiFetch('/api/workshop/mechanic-queue')
  },

  /** Send a WhatsApp notification with parts list to the client. */
  notifyWhatsApp: async (id, parts = []) => {
    return apiFetch(`/api/workshop/motorcycles/${id}/whatsapp`, {
      method: 'POST',
      body: JSON.stringify({ parts })
    })
  },
}
