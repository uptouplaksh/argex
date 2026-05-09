import { useEffect, useRef, useState } from 'react'
import { getStoredToken } from '../services/tokenService'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000]

function parseSocketMessage(rawMessage) {
  try {
    return JSON.parse(rawMessage)
  } catch {
    return null
  }
}

function useAuctionWebSocket(auctionId, onEvent) {
  const [status, setStatus] = useState(auctionId ? 'connecting' : 'idle')
  const socketRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const reconnectAttemptRef = useRef(0)
  const manuallyClosedRef = useRef(false)
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (!auctionId) {
      const idleTimer = setTimeout(() => setStatus('idle'), 0)
      return () => clearTimeout(idleTimer)
    }

    manuallyClosedRef.current = false

    function clearReconnectTimer() {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    function connect() {
      clearReconnectTimer()
      setStatus('connecting')

      const token = getStoredToken()
      const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : ''
      const socket = new WebSocket(`${WS_BASE_URL}/ws/auctions/${auctionId}${tokenQuery}`)
      socketRef.current = socket

      socket.onopen = () => {
        reconnectAttemptRef.current = 0
        setStatus('connected')
      }

      socket.onmessage = (event) => {
        const message = parseSocketMessage(event.data)

        if (!message) {
          return
        }

        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }))
          return
        }

        onEventRef.current?.(message)
      }

      socket.onerror = () => {
        setStatus('error')
      }

      socket.onclose = () => {
        if (manuallyClosedRef.current) {
          setStatus('disconnected')
          return
        }

        setStatus('reconnecting')
        const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)]
        reconnectAttemptRef.current += 1
        reconnectTimerRef.current = setTimeout(connect, delay)
      }
    }

    const connectTimer = setTimeout(connect, 0)

    return () => {
      manuallyClosedRef.current = true
      clearTimeout(connectTimer)
      clearReconnectTimer()

      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [auctionId])

  return status
}

export default useAuctionWebSocket
