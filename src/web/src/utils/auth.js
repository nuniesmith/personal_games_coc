import { authAPI } from '../services/api'

// Simple auto-authentication utility
export const initializeAuth = async () => {
  try {
    // Check if we already have a token
    const existingToken = localStorage.getItem('coc_auth_token')
    
    if (existingToken) {
      // Validate the existing token using the validate endpoint
      try {
        const baseURL = process.env.NODE_ENV === 'development'
          ? (import.meta.env.VITE_API_URL || '/api')
          : (import.meta.env.VITE_API_URL || '/api')
          
        const response = await fetch(`${baseURL}/auth/validate`, {
          headers: {
            'Authorization': `Bearer ${existingToken}`
          }
        })
        
        if (response.ok) {
          return true // Token is valid
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('coc_auth_token')
        }
      } catch (error) {
        // Token validation failed, remove it
        localStorage.removeItem('coc_auth_token')
      }
    }

    // Auto-login with default credentials (for private server)
    console.log('🔐 Auto-authenticating...')
    const loginResponse = await authAPI.login({
      username: 'admin',
      password: 'admin123'
    })

    if (loginResponse.token) {
      localStorage.setItem('coc_auth_token', loginResponse.token)
      console.log('✅ Auto-authentication successful')
      return true
    }

    throw new Error('No token received')
  } catch (error) {
    console.error('❌ Auto-authentication failed:', error)
    
    // Try with freddy credentials as fallback
    try {
      console.log('🔐 Trying fallback credentials...')
      const loginResponse = await authAPI.login({
        username: 'freddy',
        password: 'admin123'
      })

      if (loginResponse.token) {
        localStorage.setItem('coc_auth_token', loginResponse.token)
        console.log('✅ Fallback authentication successful')
        return true
      }
    } catch (fallbackError) {
      console.error('❌ Fallback authentication failed:', fallbackError)
    }

    return false
  }
}

export const logout = () => {
  localStorage.removeItem('coc_auth_token')
  console.log('🚪 Logged out')
}

export const isAuthenticated = () => {
  return !!localStorage.getItem('coc_auth_token')
}
