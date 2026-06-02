import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import session from 'express-session'
import RedisStore from 'connect-redis'
import { createClient } from 'redis'
import pinoHttp from 'pino-http'
import { config } from './config.js'
import authRoutes from './routes/auth.routes.js'
import workshopRoutes from './routes/workshop.routes.js'
import historyRoutes from './routes/history.routes.js'
import proxyRoutes from './routes/proxy.routes.js'
import { setupChatWsProxy } from './websocket/chatWsProxy.js'

// ── Redis ──────────────────────────────────────────────────────────────────
const redisClient = createClient({ url: config.REDIS_URL })
redisClient.on('error', (err) => console.error('[redis] Error:', err))
await redisClient.connect()

// ── App ────────────────────────────────────────────────────────────────────
const app = express()

app.use(helmet())
const allowedOrigins = [
  config.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:5174',
]
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(pinoHttp())

// ── Sesiones ───────────────────────────────────────────────────────────────
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24, // 24 h
  },
}))

// ── Rutas ──────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes)
app.use('/api/workshop', workshopRoutes)
app.use('/api/history',  historyRoutes)
app.use('/api',          proxyRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// ── Error handler global ───────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[error]', err.message)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message,
  })
})

// ── Inicio ─────────────────────────────────────────────────────────────────
export const server = app.listen(config.PORT, () => {
  console.log(`[bff] Servidor corriendo en http://localhost:${config.PORT}`)
})

setupChatWsProxy(server, redisClient)
