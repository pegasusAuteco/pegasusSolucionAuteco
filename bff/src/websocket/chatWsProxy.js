import { WebSocket, WebSocketServer } from 'ws'
import { parse as parseCookie } from 'cookie'

const wss = new WebSocketServer({ noServer: true })

const MAX_WS_PER_IP = 5
const connectionsByIp = new Map()

/**
 * Extrae el session ID de la cookie connect.sid firmada.
 * Formato: s:SESSIONID.SIGNATURE (URL-encoded)
 */
function extractSessionId(rawSid) {
  const decoded = decodeURIComponent(rawSid)
  if (!decoded.startsWith('s:')) return null
  return decoded.slice(2).split('.')[0]
}

/**
 * Adjunta el proxy WebSocket al servidor HTTP de Express.
 * Recibe redisClient ya conectado para evitar una segunda conexión a Redis.
 */
export function setupChatWsProxy(server, redisClient) {
  server.on('upgrade', async (req, socket, head) => {
    const url = req.url ?? ''
    console.log(`[ws-proxy] upgrade recibido — url: ${url}`)
    console.log('[WS] upgrade request path:', req.url)

    if (!url.startsWith('/api/chat/ws/')) {
      console.log(`[ws-proxy] path no manejado — destruyendo socket`)
      socket.destroy()
      return
    }

    // ── Leer sesión desde Redis ──────────────────────────────────────────────
    const cookies = parseCookie(req.headers.cookie ?? '')
    const rawSid = cookies['connect.sid']
    if (!rawSid) {
      console.warn('[ws-proxy] sin cookie connect.sid — destruyendo socket')
      console.log('[WS] REJECT: no cookie')
      socket.destroy()
      return
    }

    const sessionId = extractSessionId(rawSid)
    if (!sessionId) {
      console.warn('[ws-proxy] sessionId inválido — destruyendo socket')
      console.log('[WS] REJECT: invalid sessionId')
      socket.destroy()
      return
    }

    let jwt
    try {
      const raw = await redisClient.get(`sess:${sessionId}`)
      if (!raw) {
        console.warn(`[ws-proxy] sesión ${sessionId} no encontrada en Redis`)
        console.log('[WS] REJECT: session not found in Redis')
        wss.handleUpgrade(req, socket, head, (ws) => ws.close(4001, 'Session invalid'))
        return
      }
      jwt = JSON.parse(raw).jwt
    } catch (err) {
      console.error('[ws-proxy] Error leyendo sesión:', err.message)
      socket.destroy()
      return
    }

    if (!jwt) {
      console.warn('[ws-proxy] Sesión sin JWT — rechazando conexión')
      console.log('[WS] REJECT: no JWT in session')
      wss.handleUpgrade(req, socket, head, (ws) => ws.close(4001, 'Session invalid'))
      return
    }

    console.log('[WS] ACCEPT: handshake ok')

    // ── Extraer conversationId del path ──────────────────────────────────────
    const conversationId = url.replace('/api/chat/ws/', '').split('?')[0]
    if (!conversationId) {
      console.warn('[ws-proxy] conversationId vacío — destruyendo socket')
      socket.destroy()
      return
    }

    console.log(`[ws-proxy] autenticado — conectando a FastAPI para conversación ${conversationId}`)

    // ── Límite de conexiones por IP ──────────────────────────────────────────
    const ip = req.socket.remoteAddress ?? 'unknown'
    const ipConns = connectionsByIp.get(ip) ?? new Set()
    if (ipConns.size >= MAX_WS_PER_IP) {
      console.warn(`[ws-proxy] límite de ${MAX_WS_PER_IP} conexiones alcanzado para IP ${ip}`)
      socket.destroy()
      return
    }

    // ── Conectar a FastAPI ───────────────────────────────────────────────────
    const backendUrl = `ws://backend:8000/chat/ws/${conversationId}?token=${jwt}`
    const backendWs = new WebSocket(backendUrl)

    wss.handleUpgrade(req, socket, head, (browserWs) => {
      ipConns.add(browserWs)
      connectionsByIp.set(ip, ipConns)

      const queue = []
      let backendReady = false

      // Browser → FastAPI (bufferea hasta que el backend esté listo)
      // data llega como Buffer — convertir a string para que FastAPI lo reciba como frame de texto
      browserWs.on('message', (data, isBinary) => {
        const payload = isBinary ? data : data.toString()
        if (backendReady && backendWs.readyState === WebSocket.OPEN) {
          backendWs.send(payload)
        } else {
          queue.push(payload)
        }
      })

      // FastAPI conectado → vaciar cola y habilitar bridge
      backendWs.on('open', () => {
        backendReady = true
        queue.forEach((msg) => backendWs.send(msg))
        queue.length = 0
        console.log(`[ws-proxy] Bridge listo — conversación ${conversationId}`)
      })

      // FastAPI → Browser (tokens de streaming)
      backendWs.on('message', (data) => {
        if (browserWs.readyState === WebSocket.OPEN) {
          browserWs.send(data)
        }
      })

      // Cierres — limpiar tracking de IP al desconectar
      browserWs.on('close', () => {
        ipConns.delete(browserWs)
        if (ipConns.size === 0) connectionsByIp.delete(ip)
        if (backendWs.readyState !== WebSocket.CLOSED) backendWs.close()
      })
      backendWs.on('close', (code, reason) => {
        if (browserWs.readyState === WebSocket.OPEN) browserWs.close(code, reason)
      })

      // Errores
      browserWs.on('error', (err) => {
        console.error('[ws-proxy] Error browser WS:', err.message)
        if (backendWs.readyState !== WebSocket.CLOSED) backendWs.close()
      })
      backendWs.on('error', (err) => {
        console.error('[ws-proxy] Error backend WS:', err.message)
        if (browserWs.readyState === WebSocket.OPEN) browserWs.close()
      })
    })
  })
}
