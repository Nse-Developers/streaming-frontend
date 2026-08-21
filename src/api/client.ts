import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ExceptionResponse } from './types'

/** Em desenvolvimento usamos o proxy do Vite (`/api` -> backend, ver
 *  vite.config.ts): as requests saem para a MESMA origem do front, então não
 *  existe preflight nem CORS para falhar quando a porta do dev server muda.
 *  Em produção fala direto com a API, e aí o CORS do backend precisa liberar o
 *  domínio de onde o front é servido. */
export const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL ?? 'http://localhost:8080')

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // A sessão inteira vive no cookie HttpOnly `byou_session`, que o backend seta
  // no login (Set-Cookie) e o navegador reenvia sozinho a cada request — o
  // front nunca lê nem guarda o token. withCredentials é o que faz o browser
  // efetivamente mandar (e aceitar) esse cookie em requests cross-origin;
  // sem isso o cookie simplesmente não vai, mesmo com CORS liberado.
  withCredentials: true,
  // Nomes que o Spring Security usa por padrão para o par de CSRF
  // (CookieCsrfTokenRepository): cookie legível por JS + header ecoado nas
  // escritas. O axios lê o cookie e preenche o header sozinho a cada request
  // que bater no mesmo domínio — não precisa de interceptor manual para isso.
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  timeout: 30_000,
})

/** Assinantes notificados quando a API rejeita a sessão (401).
 *  O AuthContext escuta isso para derrubar a sessão sem acoplar axios ao React. */
type UnauthorizedListener = (status: number) => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

/** Erro normalizado: as rotas do backend devolvem dois formatos distintos
 *  (ExceptionResponse com `message`, ou o erro padrão do Spring sem `message`). */
export class ApiError extends Error {
  readonly status: number
  readonly isNetworkError: boolean

  constructor(message: string, status: number, isNetworkError = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.isNetworkError = isNetworkError
  }
}

const FALLBACK_BY_STATUS: Record<number, string> = {
  400: 'Dados inválidos. Confira as informações e tente novamente.',
  401: 'Sua sessão expirou. Entre novamente para continuar.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontramos o que você procura.',
  409: 'Essa ação já foi feita antes.',
  413: 'O arquivo é maior do que o limite permitido.',
  500: 'O servidor falhou ao processar essa ação. Tente de novo em instantes.',
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ExceptionResponse>) => {
    if (!error.response) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine
      return Promise.reject(
        new ApiError(
          offline
            ? 'Você está sem conexão. Verifique sua internet.'
            : 'Não foi possível falar com o servidor. Está fora do ar no momento',
          0,
          true,
        ),
      )
    }

    const { status, data } = error.response

    // 401 sempre invalida a sessão. Um 403 NÃO invalida: neste backend ele
    // significa tanto "sessão recusada" (cookie ausente/inválido faz a request
    // seguir anônima) quanto "logado, mas sem o papel necessário" — e derrubar
    // a sessão no segundo caso expulsaria o usuário de uma tela legítima.
    // Sessão inválida no cookie é detectada no boot por AuthContext (GET /me).
    if (status === 401) {
      unauthorizedListeners.forEach((listener) => listener(status))
    }

    const apiMessage = typeof data?.message === 'string' ? data.message.trim() : ''
    return Promise.reject(
      new ApiError(apiMessage || FALLBACK_BY_STATUS[status] || 'Algo deu errado.', status),
    )
  },
)

/** Mensagem segura para exibir ao usuário, venha o erro de onde vier. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Algo deu errado. Tente novamente.'
}
