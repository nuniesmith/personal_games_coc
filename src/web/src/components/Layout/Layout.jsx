import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Settings, Activity, FileText, Home, Menu, X, Wifi, WifiOff, Layers } from 'lucide-react'
import { useSocket } from '../../contexts/SocketContext'
import StatusIndicator from '../Common/StatusIndicator'
import { useTheme } from '../../contexts/ThemeContext.jsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Clan Dashboard', href: '/coc', icon: Activity },
  { name: 'Base Designer', href: '/base', icon: Layers },
  { name: 'Guides', href: '/guides', icon: FileText },
  { name: 'Assets', href: '/assets', icon: FileText },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'Bot Status', href: '/bot-status', icon: Activity },
]

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { connected } = useSocket()
  const { theme, setTheme } = useTheme()

  const currentPage = navigation.find(item => item.href === location.pathname)?.name || 'Clash Tools'

  const NavLinks = ({ onClick }) => (
    <>
      {navigation.map(item => {
        const isActive = location.pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={onClick}
            className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-700/60 hover:text-white ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300'}`}
          >
            <Icon className="w-4 h-4" />
            {item.name}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-coc-dark to-gray-900">
      {/* Top navigation bar */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-gray-900/80 bg-gray-900/95 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-coc-primary to-coc-accent rounded-lg flex items-center justify-center font-bold text-white">C</div>
              <div className="hidden sm:block leading-tight">
                <div className="text-sm font-semibold text-white">Feast or Famine</div>
                <div className="text-[11px] text-gray-400">{currentPage}</div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <NavLinks />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs px-2 py-1 rounded-md border border-gray-700 bg-gray-800/60">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-gray-300">{connected ? 'online' : 'offline'}</span>
              {connected ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="text-xs px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200"
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button
              className="md:hidden text-gray-300 hover:text-white p-2 rounded-md hover:bg-gray-700"
              onClick={() => setMobileOpen(o => !o)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {/* Mobile panel */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-700 px-4 pb-4 pt-2 flex flex-col gap-2 bg-gray-900/95">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-400">Navigation</span>
              <StatusIndicator status={connected ? 'online' : 'offline'} />
            </div>
            <NavLinks onClick={() => setMobileOpen(false)} />
          </div>
        )}
      </nav>

      {/* Main content area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <footer className="mt-auto border-t border-gray-700 bg-gray-900/80 backdrop-blur px-4 sm:px-6 lg:px-8 py-4 text-xs text-gray-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>© 2025 Feast or Famine</span>
            <span>•</span>
            <span>Clan tools</span>
          </div>
          <div className="flex items-center gap-2">
            <span>v1.0.0</span>
            <span>•</span>
            <span>{connected ? 'Realtime OK' : 'Realtime down'}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
