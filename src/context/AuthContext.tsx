import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi } from '@/api/services'
import { ApiError, onUnauthorized } from '@/api/client'
import type {
  UserAuth,
  UserRegisterRequest,
  UserResponse,
  UserTypeAccount,
} from '@/api/types'

/** Sessão derivada de GET /auth/me — nunca do token em si.
 *
 *  Desde a migração para cookie HttpOnly, o front não tem mais acesso ao JWT
 *  (nem deveria: é o objetivo do HttpOnly, impedir leitura por JavaScript,
 *  inclusive um script malicioso via XSS). Quem sabe quem está logado é
 *  sempre o servidor — o front só pergunta. */
export interface AuthUser {
  id: number
  name: string
  surname: string
  email: string
  userAuth: UserAuth
  userTypeAccount: UserTypeAccount
  /** Campos de perfil. Desde 2026-08-09 /auth/me devolve todos, o que permite
   *  ao formulário de perfil abrir preenchido em vez de em branco. */
  bio: string
  profilePhoto: string
  state: string
  country: string
  linkInstagram: string
  linkYoutube: string
  linkWebsite: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** Pode enviar vídeos e gerenciar categorias (ROLE_CREATORS ou ROLE_ADMIN). */
  isCreator: boolean
  isAdmin: boolean
  /** false até a primeira checagem de sessão (GET /me) responder — evita
   *  redirect indevido no F5 antes de saber se o cookie ainda é válido. */
  isReady: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: UserRegisterRequest) => Promise<void>
  logout: () => Promise<void>
  /** Relê GET /auth/me. Usado depois de salvar o perfil, para o app refletir
   *  os dados novos sem esperar um F5. */
  refreshUser: () => Promise<boolean | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** O DTO da API chama o campo de `typeAccount`; dentro do app usamos o nome
 *  completo `userTypeAccount` para não confundir com `userAuth`. */
function toAuthUser(response: UserResponse): AuthUser {
  return {
    id: response.id,
    name: response.name,
    surname: response.surname ?? '',
    email: response.email,
    userAuth: response.userAuth,
    userTypeAccount: response.typeAccount,
    // O backend declara estas colunas NOT NULL, mas contas antigas podem ter
    // vindo de antes disso — o ?? evita um campo `undefined` chegar no form.
    bio: response.bio ?? '',
    profilePhoto: response.profilePhoto ?? '',
    state: response.state ?? '',
    country: response.country ?? '',
    linkInstagram: response.linkInstagram ?? '',
    linkYoutube: response.linkYoutube ?? '',
    linkWebsite: response.linkWebsite ?? '',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  /** Pergunta ao servidor quem está logado agora, a partir do cookie que o
   *  navegador já anexou sozinho. 401/403 (ou qualquer erro que não seja de
   *  rede) significa "ninguém" — não há sessão válida para restaurar. */
  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me()
      setUser(toAuthUser(me))
      return true
    } catch (error) {
      // Erro de rede (offline, servidor fora) não prova que a sessão é
      // inválida — só que não deu para confirmar agora. Mantém o usuário
      // atual em vez de derrubar a sessão por um problema de conectividade.
      if (error instanceof ApiError && error.isNetworkError) return null
      setUser(null)
      return false
    }
  }, [])

  // Ao montar, pergunta ao servidor se o cookie (se houver) ainda é válido.
  // Isto substitui a leitura de localStorage: a única fonte de verdade agora
  // é o próprio backend.
  useEffect(() => {
    let cancelled = false
    void refreshUser().finally(() => {
      if (!cancelled) setIsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [refreshUser])

  // A camada HTTP avisa quando o backend responde 401 em qualquer request —
  // sinal de que o cookie expirou ou foi invalidado no meio da sessão.
  useEffect(() => onUnauthorized(() => setUser(null)), [])

  const login = useCallback(
    async (email: string, password: string) => {
      await authApi.login({ email, password })
      // O login não devolve o usuário no corpo (só o Set-Cookie) — busca em
      // seguida. Se isto falhar, o cookie não pegou por algum motivo (bloqueio
      // de terceiros, CSRF mal configurado etc.) e é melhor avisar já.
      const ok = await refreshUser()
      if (!ok) {
        throw new ApiError(
          'Não foi possível confirmar sua sessão. Verifique se cookies estão habilitados.',
          0,
        )
      }
    },
    [refreshUser],
  )

  const register = useCallback(
    async (input: UserRegisterRequest) => {
      await authApi.register(input)
      // O register também não autentica sozinho: loga em seguida com as
      // mesmas credenciais.
      await login(input.email, input.password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      // Limpa o estado local mesmo se a chamada falhar (ex.: já sem sessão) —
      // o objetivo é o usuário sair da área logada, o cookie HttpOnly quem
      // decide se de fato foi revogado no servidor.
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const isAdmin = user?.userAuth === 'ADMIN'
    return {
      user,
      isAuthenticated: Boolean(user),
      isCreator: user?.userTypeAccount === 'CREATORS' || isAdmin,
      isAdmin,
      isReady,
      login,
      register,
      logout,
      refreshUser,
    }
  }, [user, isReady, login, register, logout, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
