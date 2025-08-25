import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import { useNotifications } from './NotificationContext.jsx'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [logs, setLogs] = useState([])
  const [war, setWar] = useState(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const { add } = useNotifications() || { add: () => {} }

  useEffect(() => {
    // Initialize socket connection
  const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
    })

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id)
      setConnected(true)
      reconnectAttempts.current = 0
  add({ type: 'success', title: 'Socket Connected', message: `ID ${newSocket.id}` })
    })

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason)
      setConnected(false)
      
      if (reason === 'io server disconnect') {
  add({ type: 'error', title: 'Server disconnected' })
      } else {
  add({ type: 'warning', title: 'Disconnected', message: 'Reconnecting…' })
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      reconnectAttempts.current += 1
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
  add({ type: 'error', title: 'Failed to connect to server' })
      }
    })

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`)
  add({ type: 'success', title: 'Reconnected', message: `After ${attemptNumber} attempts` })
    })

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed')
  add({ type: 'error', title: 'Reconnection failed' })
    })

    // War updates
    newSocket.on('war:update', (payload) => {
      setWar(payload)
    })
    // Summary updates (lightweight war + rate limit diff)
    newSocket.on('coc:summary:update', (payload) => {
      if (payload?.war) {
        setWar(prev => ({ ...prev, ...payload.war }));
      }
    })

    // Prep stats push (live prep phase insights)
    newSocket.on('war:prepStatsPush', (payload) => {
      console.log('📊 Prep stats push received', payload?.clanTag)
      add({ type: 'info', title: 'Prep Stats Updated', message: `Clan ${payload?.clanTag || ''}` })
      // Bubble event through window for components that want to listen without context prop drilling
      try { window.dispatchEvent(new CustomEvent('prepStats:push', { detail: payload })) } catch(_){}
    })

    // Assignments generated (live refresh)
    newSocket.on('assignments:generated', (payload) => {
      console.log('🗂️ Assignments generated push', payload?.clanTag)
      add({ type: 'success', title: 'Assignments Generated', message: `Algo: ${payload?.payload?.algorithm || 'n/a'}` })
      try { window.dispatchEvent(new CustomEvent('assignments:generated', { detail: payload })) } catch(_){}
    })

    // Log events
    newSocket.on('log:entry', (logEntry) => {
      setLogs(prev => {
        const newLogs = [...prev, {
          id: logEntry.id || Date.now(),
          timestamp: new Date(logEntry.timestamp),
          type: logEntry.type || 'server',
          level: logEntry.level || 'info',
          message: logEntry.message,
          data: logEntry.data
        }]
        
        // Keep only last 1000 log entries
        return newLogs.slice(-1000)
      })
    })

    // System events
    newSocket.on('system:metrics', (metrics) => {
      // Handle system metrics updates
      console.log('📈 System metrics:', metrics)
    })

    newSocket.on('system:alert', (alert) => {
      console.warn('⚠️ System alert:', alert)
      
      switch (alert.level) {
        case 'error':
          add({ type: 'error', title: 'System Error', message: alert.message })
          break
        case 'warning':
          add({ type: 'warning', title: 'Warning', message: alert.message })
          break
        case 'info':
          add({ type: 'info', title: 'Info', message: alert.message })
          break
        default:
          add({ type: 'info', title: 'Notice', message: alert.message })
      }
    })

    setSocket(newSocket)

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection')
      newSocket.close()
    }
  }, [])

  // Socket methods
  const emit = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot emit event:', event)
  add({ type: 'error', title: 'Not connected to server' })
    }
  }

  const emitWithCallback = (event, data) => {
    return new Promise((resolve, reject) => {
      if (socket && connected) {
        socket.emit(event, data, (response) => {
          if (response.success) {
            resolve(response.data)
          } else {
            reject(new Error(response.error))
          }
        })
      } else {
        reject(new Error('Socket not connected'))
      }
    })
  }

  // Clear logs
  const clearLogs = () => {
    setLogs([])
  }

  // Filter logs
  const getLogsByType = (type) => {
    return logs.filter(log => log.type === type)
  }

  const getLogsByLevel = (level) => {
    return logs.filter(log => log.level === level)
  }

  const value = {
    socket,
    connected,
    logs,
  war,
    emit,
    emitWithCallback,
    clearLogs,
    getLogsByType,
    getLogsByLevel,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export default SocketContext
