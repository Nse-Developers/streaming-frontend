import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/services'
import {
  ApiError,
  clearCsrfToken,
  clearSessionToken,
  onUnauthorized,
  refreshCsrfToken,
} from '@/api/client'
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
  /** Selo de verificado da PRÓPRIA conta, vindo de /auth/me.
   *
   *  Fica na sessão para o app saber rapidamente se o usuário logado é
   *  verificado, mesmo quando a rota que está sendo carregada não repassa o
   *  campo. Em 2026-09-10 o backend já entrega `userIsVerified` em várias
   *  rotas, mas /auth/me continua sendo a fonte mais simples e direta para o
   *  próprio usuário. */
  isVerified: boolean
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
    // `=== true` e não `??`: contra um backend anterior à feature o campo vem
    // `undefined`, e o que se quer nesse caso é "não verificado na tela", não
    // um valor ausente vazando para dentro do app como se fosse booleano.
    isVerified: response.userIsVerified === true,
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
  const queryClient = useQueryClient()

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

      // Só 401/403 provam que a credencial foi RECUSADA. Um 500 aqui é falha
      // do servidor, não sessão inválida: descartar o token nesse caso faria o
      // usuário ter de logar de novo por causa de um erro passageiro que nem
      // era dele. Nesses o usuário sai da tela logada, mas a credencial fica —
      // o próximo boot tenta de novo.
      //
      // A checagem de `exp` do client.ts cobre o caso comum, mas só funciona
      // se o token for um JWT legível. Aqui quem responde é o servidor, então
      // pega também token opaco, sessão revogada antes da hora e chave trocada
      // no backend — casos em que o `exp` ainda diria "válido".
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearSessionToken()
        clearCsrfToken()
      }
      setUser(null)
      return false
    }
  }, [])

  // Ao montar, pergunta ao servidor se a credencial que temos ainda vale — o
  // token restaurado do sessionStorage, ou o cookie onde ele funciona. Quem
  // decide se a sessão é válida é sempre o backend: o token no storage prova
  // apenas que houve um login, não que ele ainda está de pé.
  useEffect(() => {
    let cancelled = false
    // O token CSRF vive só em memória, então um refresh de página o perde
    // enquanto o cookie de sessão sobrevive. Sem repô-lo aqui, a sessão
    // restaurada lê tudo mas falha em toda escrita com 403 até o próximo
    // login. Buscar antes de refreshUser garante que a interface só fica
    // pronta com o par sessão + token completo.
    void refreshCsrfToken()
      .then(() => refreshUser())
      .finally(() => {
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
      // Troca de sessão no mesmo navegador: descarta o cache da sessão
      // anterior ANTES de assumir a nova. Sem isto, chaves sem identidade de
      // usuário (['videos'], ['users'], ['comments', id]) serviriam ao novo
      // usuário o que o anterior carregou.
      queryClient.clear()
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
    [refreshUser, queryClient],
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
    } catch {
      // Sair NÃO pode falhar. `finally` limpava o estado mas relançava o erro,
      // que subia como "Uncaught (in promise)" e chegava à interface — o
      // usuário via "Você não tem permissão para fazer isso" ao clicar em
      // sair, num fluxo que do ponto de vista dele deu certo.
      //
      // Avisar o servidor é o melhor esforço: o que efetiva a saída é
      // descartar a credencial local, e isso acontece abaixo de todo modo.
      // Um 403 aqui só significa que a sessão já não valia no servidor.
    } finally {
      // Limpa o estado local mesmo se a chamada falhar (ex.: já sem sessão) —
      // o objetivo é o usuário sair da área logada. authApi.logout() ja
      // descartou o token do storage; o JWT segue válido no servidor até
      // expirar, porque não há revogação.
      setUser(null)
      // E descarta TODO o cache de dados da sessão. `setUser(null)` só apaga
      // quem está logado; as respostas já buscadas continuavam vivas no
      // QueryClient (gcTime padrão de 5 min) e o logout é navegação SPA, sem
      // reload que as apagasse. Num computador compartilhado, o próximo a
      // entrar recebia do cache o feed, os comentários e — para um admin que
      // passou por /admin — a lista de usuários com os e-mails de todos.
      queryClient.clear()
    }
  }, [queryClient])

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
