import { createContext, useContext, useMemo, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem('campuspulse-auth')
    return raw ? JSON.parse(raw) : null
  })

  const login = async (payload) => {
    const response = await api.post('/auth/login', payload)
    const nextAuth = {
      user: response.data.user,
      token: response.data.token
    }
    localStorage.setItem('campuspulse-auth', JSON.stringify(nextAuth))
    localStorage.setItem('campuspulse-token', nextAuth.token)
    setAuth(nextAuth)
    return nextAuth
  }

  const logout = () => {
    localStorage.removeItem('campuspulse-auth')
    localStorage.removeItem('campuspulse-token')
    setAuth(null)
  }

  const value = useMemo(() => ({ auth, login, logout }), [auth])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
