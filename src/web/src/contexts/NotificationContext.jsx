import React, { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const remove = useCallback(id => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const add = useCallback(({ type = 'info', title, message, duration = 4000, action }) => {
    const id = Math.random().toString(36).slice(2)
    setNotifications(prev => [...prev, { id, type, title, message, action }])
    if (duration !== 0) setTimeout(() => remove(id), duration)
  }, [remove])

  const clear = useCallback(() => setNotifications([]), [])

  return (
    <NotificationContext.Provider value={{ add, remove, clear }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-3 w-80 max-w-full">
        {notifications.map(n => (
          <div key={n.id} className="bg-gray-800/95 backdrop-blur rounded-lg border border-gray-700 p-4 shadow-lg flex gap-3 animate-fade-in">
            <div className="mt-0.5">
              {n.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
              {n.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
              {n.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              {n.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{n.title}</p>
              {n.message && <p className="text-xs text-gray-300 mt-1 whitespace-pre-wrap break-words">{n.message}</p>}
              {n.action && <button onClick={n.action.onClick} className="mt-2 text-xs text-coc-primary hover:underline">{n.action.label}</button>}
            </div>
            <button onClick={() => remove(n.id)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
