/**
 * WebSocket proxy for real-time chat streaming.
 *
 * Bridges browser WebSocket connections to FastAPI's WebSocket endpoint.
 * Authenticates connections by reading the JWT from the Redis-backed session.
 * Enforces a per-IP connection limit to prevent abuse.
 *
 * Flow:
 * 1. Browser connects to /api/chat/ws/{conversationId}
 * 2. BFF extracts session cookie and reads JWT from Redis
 * 3. BFF opens a WebSocket to FastAPI backend with the JWT
 * 4. Messages are proxied bidirectionally between browser and FastAPI
 */
import { WebSocket, WebSocketServer } from 'ws'
import { parse as parseCookie } from 'cookie'

const wss = new WebSocketServer({ noServer: true })

const MAX_WS_PER_IP = 5
const connectionsByIp = new Map()

/**
 * Extracts the session ID from a signed connect.sid cookie.
 * Format: s:SESSIONID.SIGNATURE (URL-encoded)
 *
 * @param {string} rawSid - Raw cookie value
 * @returns {string|null} Session ID or null if invalid
 */
function extractSessionId(rawSid) {
  const decoded = decodeURIComponent(rawSid)
  if (!decoded.startsWith('s:')) return null
  return decoded.slice(2).split('.')[0]
}

/**
 * Attaches the WebSocket proxy to the Express HTTP server.
 *
 * Intercepts upgrade requests for /api/chat/ws/* paths,
 * authenticates via Redis session, and proxies to FastAPI.
 *
 * @param {import('http').Server} server - Express HTTP server
 * @param {import('redis').RedisClient} redisClient - Connected Redis client
 */
export function setupChatWsProxy(server, redisClient) {
  server.on('upgrade', async (req, socket, head) => {
    const url = req.url ?? ''

    if (!url.startsWith('/api/chat/ws/')) {
      console.log(`[ws-proxy] Unhandled path — destroying socket`)
      socket.destroy()
      return
    }

    // ── Read session from Redis ──────────────────────────────────────────
    const cookies = parseCookie(req.headers.cookie ?? '')
    const rawSid = cookies['connect.sid']
    if (!rawSid) {
      console.warn('[ws-proxy] No connect.sid cookie — destroying socket')
      socket.destroy()
      return
    }

    const sessionId = extractSessionId(rawSid)
    if (!sessionId) {
      console.warn('[ws-proxy] Invalid sessionId — destroying socket')
      socket.destroy()
      return
    }

    let jwt
    try {
      const raw = await redisClient.get(`sess:${sessionId}`)
      if (!raw) {
        console.warn(`[ws-proxy] Session ${sessionId} not found in Redis`)
        wss.handleUpgrade(req, socket, head, (ws) => ws.close(4001, 'Session invalid'))
        return
      }
      jwt = JSON.parse(raw).jwt
    } catch (err) {
      console.error('[ws-proxy] Error reading session:', err.message)
      socket.destroy()
      return
    }

    if (!jwt) {
      console.warn('[ws-proxy] Session without JWT — rejecting connection')
      wss.handleUpgrade(req, socket, head, (ws) => ws.close(4001, 'Session invalid'))
      return
    }

    // ── Extract conversationId from path ─────────────────────────────────
    const conversationId = url.replace('/api/chat/ws/', '').split('?')[0]
    if (!conversationId) {
      console.warn('[ws-proxy] Empty conversationId — destroying socket')
      socket.destroy()
      return
    }

    console.log(`[ws-proxy] Authenticated — connecting to FastAPI for conversation ${conversationId}`)

    // ── Per-IP connection limit ──────────────────────────────────────────
    const ip = req.socket.remoteAddress ?? 'unknown'
    const ipConns = connectionsByIp.get(ip) ?? new Set()
    if (ipConns.size >= MAX_WS_PER_IP) {
      console.warn(`[ws-proxy] Connection limit of ${MAX_WS_PER_IP} reached for IP ${ip}`)
      socket.destroy()
      return
    }

    // ── Connect to FastAPI ───────────────────────────────────────────────
    const backendUrl = `ws://backend:8000/chat/ws/${conversationId}?token=${jwt}`
    const backendWs = new WebSocket(backendUrl)

    wss.handleUpgrade(req, socket, head, (browserWs) => {
      ipConns.add(browserWs)
      connectionsByIp.set(ip, ipConns)

      const queue = []
      let backendReady = false

      // Browser → FastAPI (buffer messages until backend is ready)
      // data arrives as Buffer — convert to string for FastAPI text frames
      browserWs.on('message', (data, isBinary) => {
        const payload = isBinary ? data : data.toString()
        if (backendReady && backendWs.readyState === WebSocket.OPEN) {
          backendWs.send(payload)
        } else {
          queue.push(payload)
        }
      })

      // FastAPI connected → flush queue and enable bridge
      backendWs.on('open', () => {
        backendReady = true
        queue.forEach((msg) => backendWs.send(msg))
        queue.length = 0
        console.log(`[ws-proxy] Bridge ready — conversation ${conversationId}`)
      })

      // FastAPI → Browser (streaming tokens)
      backendWs.on('message', (data) => {
        if (browserWs.readyState === WebSocket.OPEN) {
          browserWs.send(data)
        }
      })

      // Close handlers — clean up IP tracking on disconnect
      browserWs.on('close', () => {
        ipConns.delete(browserWs)
        if (ipConns.size === 0) connectionsByIp.delete(ip)
        if (backendWs.readyState !== WebSocket.CLOSED) backendWs.close()
      })
      backendWs.on('close', (code, reason) => {
        if (browserWs.readyState === WebSocket.OPEN) browserWs.close(code, reason)
      })

      // Error handlers
      browserWs.on('error', (err) => {
        console.error('[ws-proxy] Browser WS error:', err.message)
        if (backendWs.readyState !== WebSocket.CLOSED) backendWs.close()
      })
      backendWs.on('error', (err) => {
        console.error('[ws-proxy] Backend WS error:', err.message)
        if (browserWs.readyState === WebSocket.OPEN) browserWs.close()
      })
    })
  })
}
