import { fetch } from 'undici'
import { config } from '../config.js'

/**
 * Llama a FastAPI y retorna { access_token, user }.
 * FastAPI login response: { access_token, token_type, user: { id, email, name, role, created_at } }
 */
export async function login(email, password) {
  const res = await fetch(`${config.FASTAPI_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json().catch(() => ({ detail: 'Respuesta inválida del servidor' }))

  if (!res.ok) {
    const err = new Error(data.detail || 'Error en login')
    err.status = res.status
    throw err
  }

  return data // { access_token, token_type, user }
}

/**
 * FastAPI register response: { id, nombre, email, rol, empresa_taller, created_at }
 * accept_terms es requerido por la validación del backend.
 */
export async function register({ nombre, email, password, rol, empresa_taller, accept_terms = true }) {
  const res = await fetch(`${config.FASTAPI_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, password, accept_terms, empresa_taller }),
  })

  const data = await res.json().catch(() => ({ detail: 'Respuesta inválida del servidor' }))

  if (!res.ok) {
    const err = new Error(data.detail || 'Error en registro')
    err.status = res.status
    throw err
  }

  return data
}

/**
 * FastAPI no expone /auth/profile todavía.
 * Este método está listo para cuando se agregue el endpoint.
 * El router de BFF usa req.session.user como fuente de verdad por ahora.
 */
export async function getProfile(jwt) {
  const res = await fetch(`${config.FASTAPI_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${jwt}` },
  })

  const data = await res.json().catch(() => ({ detail: 'Respuesta inválida del servidor' }))

  if (!res.ok) {
    const err = new Error(data.detail || 'Error obteniendo perfil')
    err.status = res.status
    throw err
  }

  return data // { user }
}
