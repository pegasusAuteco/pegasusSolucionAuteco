/**
 * Authentication routes for login, registration, logout, and profile.
 *
 * Proxies auth requests to FastAPI and manages session state in Redis.
 * Rate limiters are applied to login and register endpoints.
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js'
import * as authService from '../services/authService.js'

const router = Router()

// POST /auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son requeridos' })
  }

  try {
    const { access_token, user } = await authService.login(email, password)
    req.session.jwt  = access_token
    req.session.user = user
    res.json({ user })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// POST /auth/register
router.post('/register', registerLimiter, async (req, res) => {
  const { nombre, email, password, rol, empresa_taller, accept_terms } = req.body

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son requeridos' })
  }

  try {
    const data = await authService.register({ nombre, email, password, rol, empresa_taller, accept_terms })
    res.status(201).json({ message: 'Usuario registrado exitosamente', data })
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' })
    }
    res.clearCookie('connect.sid')
    res.json({ message: 'Logged out' })
  })
})

// GET /auth/profile
// FastAPI does not expose /auth/profile yet: served from session data stored at login.
router.get('/profile', requireAuth, (req, res) => {
  const user = req.session.user
  if (!user) {
    return res.status(401).json({ error: 'Sesión sin datos de usuario' })
  }
  res.json({ user })
})

export default router
