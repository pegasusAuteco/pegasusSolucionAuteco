/**
 * WebSocket hook for real-time chat streaming.
 *
 * Manages connection lifecycle, automatic reconnection (up to 3 attempts),
 * streaming token display, and message sending via WebSocket.
 * Falls back to POST requests if WebSocket connection fails after 3 seconds.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Parse WebSocket message data (Blob, ArrayBuffer, or string) into a JSON object.
 *
 * @param {Blob|ArrayBuffer|string} data - The raw WebSocket message data
 * @returns {Promise<Object|null>} Parsed JSON object, or null on parse failure
 */
async function parseWsMessage(data) {
  try {
    const text = data instanceof Blob ? await data.text() :
                 data instanceof ArrayBuffer ? new TextDecoder().decode(data) :
                 String(data)
    return JSON.parse(text)
  } catch {
    return null
  }
}

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
const MAX_RECONNECT = 3
const RECONNECT_DELAY = 2000

/**
 * Hook for managing a WebSocket connection to a chat conversation.
 *
 * Handles connection, reconnection (up to 3 attempts), streaming token display,
 * and message sending. Automatically reconnects on transient failures (code 1006)
 * but not on application-level rejections (codes 4000-4999) or normal closes (1000).
 *
 * @param {string|null} conversationId - The conversation to connect to. Pass null to disconnect.
 * @param {Object} [callbacks] - Optional callback functions.
 * @param {Function} [callbacks.onError] - Called with an error message when a non-recoverable error occurs.
 * @param {Function} [callbacks.onConversationNotFound] - Called when the server rejects with code 4004.
 * @returns {{ streamingText: string, isStreaming: boolean, isConnected: boolean,
 *   sendMessage: (content: string) => boolean }}
 *   - streamingText: The accumulated text tokens from the current assistant response.
 *   - isStreaming: Whether the assistant is currently streaming a response.
 *   - isConnected: Whether the WebSocket is open and connected.
 *   - sendMessage: Sends a text message via WebSocket. Returns false if not connected.
 */
export function useChatWebSocket(conversationId, { onError, onConversationNotFound } = {}) {
  const queryClient = useQueryClient()
  const wsRef = useRef(null)
  const reconnectCountRef = useRef(0)
  const reconnectTimerRef = useRef(null)
  const stabilityTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const lastConnectedIdRef = useRef(null)

  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  /**
   * Establish a WebSocket connection to the conversation.
   *
   * Sets up onopen, onmessage, onclose, and onerror handlers.
   * On close, retries with exponential logic up to MAX_RECONNECT attempts
   * for transient failures, or calls onError for permanent rejections.
   */
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
      if (!mountedRef.current) return

      const msg = await parseWsMessage(event.data)
      if (!msg) return

      if (msg.type === 'token') {
        setStreamingText((prev) => prev + msg.content)
      } else if (msg.type === 'done') {
        setIsStreaming(false)
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      } else       if (msg.type === 'error') {
        setIsStreaming(false)
        const errorMsg = msg.message ?? 'Chat error'
        console.error('[ws] Server error:', errorMsg)
        onError?.(errorMsg)
      }
    }

    ws.onclose = (event) => {
      console.log('[ws] closed — code:', event.code, 'reason:', event.reason)
      clearTimeout(stabilityTimerRef.current)
      if (!mountedRef.current) return
      setIsConnected(false)
      setIsStreaming(false)

      // Application-level rejections (4000-4999) and normal close (1000): permanent, never retry
      if (event.code === 1000 || (event.code >= 4000 && event.code <= 4999)) {
        if (event.code === 4001) {
          window.location.href = '/login'
          return
        }
        if (event.code === 4004) {
          onConversationNotFound?.()
          return
        }
        return
      }

      // Transient abnormal closures (1006, etc.): retry up to MAX_RECONNECT
      if (reconnectCountRef.current < MAX_RECONNECT) {
        reconnectCountRef.current++
        console.log(`[ws] Reconnecting attempt ${reconnectCountRef.current}/${MAX_RECONNECT}...`)
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY)
      } else {
        console.log('[ws] Max retries reached, stopping')
        onError?.('Could not connect to chat server')
      }
    }

    ws.onerror = (error) => {
      console.log('[ws] error:', error)
    }
  }, [conversationId, queryClient])

  useEffect(() => {
    mountedRef.current = true
    // Reset counter only when conversation changes, not on every reconnection
    if (lastConnectedIdRef.current !== conversationId) {
      reconnectCountRef.current = 0
      lastConnectedIdRef.current = conversationId
    }
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

  /**
   * Send a text message through the WebSocket connection.
   *
   * Performs an optimistic update of the messages cache to show the user's
   * message immediately, then sends the raw JSON payload over the socket.
   *
   * @param {string} content - The message text to send
   * @returns {boolean} True if the message was sent, false if the socket is not open
   */
  const sendMessage = useCallback((content) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[ws] WebSocket is not connected')
      return false
    }
    setStreamingText('')
    setIsStreaming(true)
    
    // Optimistic user message update to avoid visual lag
    const optimisticMessage = {
      id: Date.now().toString(),
      conversation_id: conversationId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    queryClient.setQueryData(['messages', conversationId], (old) => {
      return old ? [...old, optimisticMessage] : [optimisticMessage]
    })
    
    wsRef.current.send(JSON.stringify({ type: 'message', content }))
    return true
  }, [conversationId, queryClient])

  return { streamingText, isStreaming, isConnected, sendMessage }
}
