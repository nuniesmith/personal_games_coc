import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import ErrorBoundary from './components/Common/ErrorBoundary.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { NotificationProvider } from './contexts/NotificationContext.jsx'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})

// Pre-render hash token handler (no Router hooks needed)
try {
  const { hash, pathname, search, origin } = window.location
  if (hash && hash.includes('token=')) {
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const tok = params.get('token')
    if (tok) {
      localStorage.setItem('coc_auth_token', tok)
      // Build clean dashboard URL preserving origin
      const newUrl = origin + '/dashboard'
      window.history.replaceState({}, '', newUrl)
    }
  }
} catch (e) {
  console.warn('Token handling failed:', e)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
