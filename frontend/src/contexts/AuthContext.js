import { createContext, useContext, useEffect, useState } from 'react'
import { apiClient } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = apiClient.getToken()
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        // Check if token is expired
        if (payload.exp * 1000 > Date.now()) {
          setUser({
            id: payload.userId,
            email: payload.email,
            role: payload.role,
            firstName: payload.firstName,
            lastName: payload.lastName
          })
        } else {
          apiClient.clearToken()
        }
      } catch (error) {
        console.error('Token parsing error:', error)
        apiClient.clearToken()
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const data = await apiClient.login(email, password)
    setUser(data.user)
    return data
  }

  const handleGoogleCallback = async (code) => {
    const data = await apiClient.handleGoogleCallback(code)
    setUser(data.user)
    return data
  }

  const logout = () => {
    apiClient.logout()
    setUser(null)
  }

  const value = {
    user,
    login,
    handleGoogleCallback,
    logout,
    loading,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}