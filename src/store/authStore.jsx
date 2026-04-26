import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

function parseJwt(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return payload
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('jwt'))
  const [user,  setUser]  = useState(() => {
    const t = localStorage.getItem('jwt')
    return t ? parseJwt(t) : null
  })

  const login = useCallback((newToken) => {
    localStorage.setItem('jwt', newToken)
    setToken(newToken)
    setUser(parseJwt(newToken))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('jwt')
    setToken(null)
    setUser(null)
  }, [])

  // Global 401 listener (dispatched by api.js on expired/invalid token)
  useEffect(() => {
    const handle = () => logout()
    window.addEventListener('auth:error', handle)
    return () => window.removeEventListener('auth:error', handle)
  }, [logout])

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
