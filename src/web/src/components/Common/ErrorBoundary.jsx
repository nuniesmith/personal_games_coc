import React from 'react'
import { AlertCircle } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl border border-red-500/40 max-w-md w-full">
            <div className="flex items-center mb-4 text-red-400">
              <AlertCircle className="w-6 h-6 mr-2" />
              <h2 className="text-lg font-semibold">Something went wrong</h2>
            </div>
            <p className="text-gray-300 mb-4 text-sm">
              The application encountered an unexpected error. You can try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-error w-full"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV !== 'development' && this.state.error && (
              <pre className="mt-4 text-xs text-red-300 whitespace-pre-wrap max-h-48 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
