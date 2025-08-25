import React from 'react'
import api from '../services/api'

export default function Login() {
  const startLogin = async () => {
    try {
      const res = await api.get('/oidc/login')
      if (res?.url) {
        window.location.href = res.url
      }
    } catch (e) {
      alert(`Login error: ${e.message}`)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <p className="text-sm text-gray-400 mb-4">Use Authentik to sign in.</p>
      <button className="btn-primary" onClick={startLogin}>Login with Authentik</button>
    </div>
  )
}
