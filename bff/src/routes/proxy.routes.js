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
