import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CURRENT_USER } from '@/mocks/data'

// Auth de PROTÓTIPO: login sempre aceita, o papel é escolhido na própria UI
// para facilitar a avaliação das telas. Trocar pela integração real depois.
export type Role = 'VIEWERS' | 'CREATORS' | 'ADMIN'

export interface AuthUser {
  id: number
  name: string
  email: string
  handle: string
  role: Role
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isCreator: boolean
  isAdmin: boolean
  login: (email: string, role?: Role) => Promise<void>
  logout: () => void
  setRole: (role: Role) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 'vero.session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        setUser(JSON.parse(raw) as AuthUser)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const persist = useCallback((next: AuthUser | null) => {
    setUser(next)
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const login = useCallback(
    async (email: string, role: Role = 'CREATORS') => {
      await new Promise((r) => setTimeout(r, 450))
      persist({ ...CURRENT_USER, email: email || CURRENT_USER.email, role })
    },
    [persist],
  )

  const logout = useCallback(() => persist(null), [persist])

  const setRole = useCallback(
    (role: Role) => {
      setUser((prev) => {
        if (!prev) return prev
        const next = { ...prev, role }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      })
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isCreator: user?.role === 'CREATORS' || user?.role === 'ADMIN',
      isAdmin: user?.role === 'ADMIN',
      login,
      logout,
      setRole,
    }),
    [user, login, logout, setRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
