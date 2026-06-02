import { fetch } from 'undici'
import { config } from '../config.js'

export async function getHistory(mechanicId, jwt) {
  const res = await fetch(`${config.FASTAPI_URL}/logs/history/${mechanicId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  })

  const data = await res.json().catch(() => ({ detail: 'Respuesta inválida del servidor' }))

  if (!res.ok) {
    const err = new Error(data.detail || 'Error obteniendo historial')
    err.status = res.status
    throw err
  }

  return data // { mechanic_id, sessions, count }
}

export async function deleteHistory(mechanicId, sessionId, jwt) {
  const res = await fetch(`${config.FASTAPI_URL}/logs/session/${mechanicId}/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${jwt}` },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Respuesta inválida del servidor' }))
    const err = new Error(data.detail || 'Error eliminando sesión')
    err.status = res.status
    throw err
  }
}
