/**
 * Chat history service for proxying history requests to FastAPI.
 *
 * Provides functions to retrieve and delete conversation session histories
 * via the FastAPI logging endpoints.
 */
import { fetch } from 'undici'
import { config } from '../config.js'

/**
 * Retrieves chat history for a mechanic from FastAPI.
 *
 * @param {string} mechanicId - The mechanic/user ID
 * @param {string} jwt - JWT access token for authentication
 * @returns {Promise<{mechanic_id: string, sessions: Array, count: number}>}
 * @throws {Error} With status code on failure
 */
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

/**
 * Deletes a specific conversation session from FastAPI logs.
 *
 * @param {string} mechanicId - The mechanic/user ID
 * @param {string} sessionId - The conversation session ID to delete
 * @param {string} jwt - JWT access token for authentication
 * @throws {Error} With status code on failure
 */
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
