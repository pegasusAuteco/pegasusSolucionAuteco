/**
 * Authentication service for proxying auth requests to FastAPI.
 *
 * Handles login, registration, and profile retrieval by forwarding
 * requests to the FastAPI backend and normalizing responses.
 */
import { fetch } from 'undici'
import { config } from '../config.js'

/**
 * Authenticates a user via FastAPI login endpoint.
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{access_token: string, user: object}>} JWT token and user data
 * @throws {Error} With status code on authentication failure
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
 * Registers a new user via FastAPI register endpoint.
 *
 * @param {object} params - Registration data
 * @param {string} params.nombre - User's full name
 * @param {string} params.email - User email
 * @param {string} params.password - Password (8-12 chars, mixed case + digit)
 * @param {string} [params.rol] - User role (optional)
 * @param {string} [params.empresa_taller] - Workshop/company name (optional)
 * @param {boolean} [params.accept_terms=true] - Terms acceptance (required by backend)
 * @returns {Promise<object>} Created user data
 * @throws {Error} With status code on registration failure
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
 * Retrieves user profile from FastAPI (placeholder).
 *
 * FastAPI does not expose /auth/profile yet. This method is ready
 * for when the endpoint is added. The BFF router currently uses
 * req.session.user as the source of truth.
 *
 * @param {string} jwt - JWT access token
 * @returns {Promise<{user: object}>} User profile data
 * @throws {Error} With status code on failure
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
