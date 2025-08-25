// Simplified environment configuration adapted from FKS project
export const envConfig = (() => {
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'
  const apiBaseUrl = import.meta.env.VITE_API_URL || '/api'
  return {
    isDev,
    apiBaseUrl,
    socketUrl: import.meta.env.VITE_SOCKET_URL || window.location.origin,
    featureFlags: {
      metrics: import.meta.env.VITE_ENABLE_METRICS === 'true',
    }
  }
})()
