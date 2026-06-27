/**
 * Chat history routes for retrieving and deleting conversation sessions.
 *
 * Proxies requests to FastAPI's logging endpoints with JWT authentication.
 * All routes require authentication.
 */
import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import * as historyService from '../services/historyService.js'

const router = Router()

router.use(requireAuth)

// GET /history
router.get('/', async (req, res) => {
  try {
    const data = await historyService.getHistory(req.session.user.id, req.session.jwt)
    res.json(data)
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

// DELETE /history/:sessionId
router.delete('/:sessionId', async (req, res) => {
  try {
    await historyService.deleteHistory(req.session.user.id, req.params.sessionId, req.session.jwt)
    res.status(204).end()
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message })
  }
})

export default router
