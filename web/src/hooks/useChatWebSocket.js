import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

async function parseWsMessage(data) {
  try {
    const text = data instanceof Blob ? await data.text() :
                 data instanceof ArrayBuffer ? new TextDecoder().decode(data) :
                 String(data)
    console.log('[ws] texto parseado:', text)
    return JSON.parse(text)
  } catch {
    return null
  }
}

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
const MAX_RECONNECT = 3
const RECONNECT_DELAY = 2000

export function useChatWebSocket(conversationId, { onError } = {}) {
  const queryClient = useQueryClient()
  const wsRef = useRef(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimerRef = useRef(null)
  const mountedRef = useRef(true)

  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(() => {
    if (!conversationId) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_BASE}/api/chat/ws/${conversationId}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      reconnectCountRef.current = 0
      setIsConnected(true)
    }

    ws.onmessage = async (event) => {
      console.log('[ws] mensaje recibido:', event.data)
      if (!mountedRef.current) return

      const msg = await parseWsMessage(event.data)
      if (!msg) return

      if (msg.type === 'token') {
        setStreamingText((prev) => prev + msg.content)
      } else if (msg.type === 'done') {
        setIsStreaming(false)
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      } else if (msg.type === 'error') {
        setIsStreaming(false)
        const errorMsg = msg.message ?? 'Error en el chat'
        console.error('[ws] Error del servidor:', errorMsg)
        onError?.(errorMsg)
      }
    }

    ws.onclose = (event) => {
      console.log('[ws] cerrado — code:', event.code, 'reason:', event.reason)
      if (!mountedRef.current) return
      setIsConnected(false)
      setIsStreaming(false)
      // Reconexión solo si no fue cierre limpio y no superamos el límite
      if (event.code !== 1000 && reconnectCountRef.current < MAX_RECONNECT) {
        reconnectCountRef.current++
        console.log(`[ws] Reconectando intento ${reconnectCountRef.current}/${MAX_RECONNECT}...`)
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY)
      }
    }

    ws.onerror = (error) => {
      console.log('[ws] error:', error)
      onError?.('No se pudo conectar con el servidor de chat')
    }
  }, [conversationId, queryClient])

  useEffect(() => {
    mountedRef.current = true
    reconnectCountRef.current = 0
    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.close(1000)
        wsRef.current = null
      }
    }
  }, [connect])

  const sendMessage = useCallback((content) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[ws] WebSocket no está conectado')
      return false
    }
    setStreamingText('')
    setIsStreaming(true)
    wsRef.current.send(JSON.stringify({ type: 'message', content }))
    return true
  }, [])

  return { streamingText, isStreaming, isConnected, sendMessage }
}
