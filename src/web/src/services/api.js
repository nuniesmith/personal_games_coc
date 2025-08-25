import axios from 'axios'
import { envConfig } from '../config/environment'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: envConfig.apiBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth headers if needed
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
  const token = localStorage.getItem('coc_auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error)
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.statusText
      throw new Error(message)
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('No response from server. Please check your connection.')
    } else {
      // Something else happened
      throw new Error(error.message)
    }
  }
)

// Server management API removed (project now Clash-focused only)

// Steam API endpoints removed (project now Clash of Clans only)

// System API endpoints
export const systemAPI = {
  // System information
  getSystemInfo: () => api.get('/system/info'),
  getSystemMetrics: () => api.get('/system/metrics'),
  
  // File operations
  uploadFile: (file, type) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    
    return api.post('/system/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  
  downloadFile: (filename) => api.get(`/system/download/${filename}`, {
    responseType: 'blob',
  }),
  
  // Package generation removed (Clash-only scope)
}

// Authentication API (if needed)
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  refreshToken: () => api.post('/auth/refresh'),
}

// Feast bot proxy API
export const clashKingAPI = {
  health: () => api.get('/feast/health'),
  info: () => api.get('/feast/info'),
  commands: (params={}) => api.get('/feast/commands', { params }),
  trackedClans: (params={}) => api.get('/feast/tracked-clans', { params }),
}

// Utility functions
export const apiUtils = {
  // Download file helper
  downloadBlob: (blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
  
  // Format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },
  
  // Format uptime
  formatUptime: (seconds) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  },
  
  // Validate server ID
  validateServerId: (serverId) => {
    return /^\d{17}$/.test(serverId)
  },
  
  // Generate random server ID (for testing)
  generateTestServerId: () => {
    return Math.floor(Math.random() * 900000000000000000) + 100000000000000000
  }
}

export default api
