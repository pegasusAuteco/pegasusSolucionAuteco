import { apiFetch } from '../lib/fetch'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export interface NotificationData {
  cliente: string;
  telefono: string;
  correo: string;
  placa: string;
  mensaje: string;
}

export const notificationService = {
  send: async (data: NotificationData): Promise<void> => {
    await apiFetch(`${baseURL}/notifications/send`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
}
