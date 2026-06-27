/**
 * FastAPI proxy route for forwarding authenticated requests.
 *
 * All /api/* requests not handled by other routers are proxied to FastAPI.
 * The JWT from the session is injected as a Bearer token in the Authorization header.
 * Path /api is rewritten to / for the backend (e.g., /api/chat -> /chat).
 */
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'
import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { config } from '../config.js'

const router = Router()

router.use(requireAuth)

const fastapiProxy = createProxyMiddleware({
  target: config.FASTAPI_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  proxyTimeout: 150_000,
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.session?.jwt) {
        proxyReq.setHeader('Authorization', `Bearer ${req.session.jwt}`)
      }
      fixRequestBody(proxyReq, req)
    },
  },
})

router.use('/', fastapiProxy)

export default router
