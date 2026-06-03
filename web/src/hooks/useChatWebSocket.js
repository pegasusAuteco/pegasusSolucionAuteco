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

export function useChatWebSocket(conversationId, { onError, onConversationNotFound } = {}) {
  const queryClient = useQueryClient()
  const wsRef = useRef(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimerRef = useRef(null)
  const stabilityTimerRef = useRef(null)
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
      setIsConnected(true)
      stabilityTimerRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          reconnectCountRef.current = 0
        }
      }, 3000)
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
      clearTimeout(stabilityTimerRef.current)
      if (!mountedRef.current) return
      setIsConnected(false)
      setIsStreaming(false)
      // Sesión inválida: el BFF completa el handshake y envía cierre explícito con código 4001
      if (event.code === 4001) {
        window.location.href = '/login'
        return
      }
      // Conversación no encontrada: limpiar ID para que Layout seleccione una válida
      if (event.code === 4004) {
        onConversationNotFound?.()
        return
      }
      if (event.code !== 1000) {
        if (reconnectCountRef.current < MAX_RECONNECT) {
          reconnectCountRef.current++
          console.log(`[ws] Reconectando intento ${reconnectCountRef.current}/${MAX_RECONNECT}...`)
          reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY)
        } else {
          // Reintentos agotados — el fallback POST ya no es suficiente, avisar al usuario
          onError?.('No se pudo conectar con el servidor de chat')
        }
      }
    }

    ws.onerror = (error) => {
      console.log('[ws] error:', error)
    }
  }, [conversationId, queryClient])

  useEffect(() => {
    mountedRef.current = true
    reconnectCountRef.current = 0
    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimerRef.current)
      clearTimeout(stabilityTimerRef.current)
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
