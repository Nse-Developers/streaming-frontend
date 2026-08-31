import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { CsrfTokenResponse, ExceptionResponse } from './types'

/** Em desenvolvimento usamos o proxy do Vite (`/api` -> backend, ver
 *  vite.config.ts): as requests saem para a MESMA origem do front, então não
 *  existe preflight nem CORS para falhar quando a porta do dev server muda.
 *  Em produção fala direto com a API, e aí o CORS do backend precisa liberar o
 *  domínio de onde o front é servido.
 *
 *  Em produção NÃO existe fallback: `vite.config.ts` falha o build quando
 *  VITE_API_URL não está definida. Um default para localhost aqui seria
 *  embutido no bundle e, junto de `withCredentials`, faria o navegador do
 *  visitante enviar e-mail e senha do login para qualquer processo escutando
 *  na porta 8080 da máquina DELE. Melhor o build quebrar do que o deploy
 *  vazar credenciais em silêncio. */
export const API_BASE_URL = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_URL

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // A sessão inteira vive no cookie HttpOnly `byou_session`, que o backend seta
  // no login (Set-Cookie) e o navegador reenvia sozinho a cada request — o
  // front nunca lê nem guarda o token. withCredentials é o que faz o browser
  // efetivamente mandar (e aceitar) esse cookie em requests cross-origin;
  // sem isso o cookie simplesmente não vai, mesmo com CORS liberado.
  withCredentials: true,
  // O par de CSRF do Spring (CookieCsrfTokenRepository) é o cookie XSRF-TOKEN
  // + o header X-XSRF-TOKEN ecoado nas escritas. Aqui NÃO configuramos
  // xsrfCookieName/xsrfHeaderName: eles só valem para o mecanismo nativo do
  // axios, que depende de ler o cookie e não funciona neste cenário (abaixo).
  //
  // `withXSRFToken: true` faria o axios PULAR o teste de mesma origem, mas não
  // resolve sozinho em produção: ele só anexa o header se
  // `cookies.read('XSRF-TOKEN')` devolver valor, e isso é `document.cookie` —
  // isolado POR ORIGEM. O cookie é setado pela API (squareweb.app), então o JS
  // do front (byou.website) não o enxerga: a leitura dá null, o header não vai,
  // e toda escrita volta 403. Em dev o proxy do Vite mascara (mesma origem).
  //
  // Por isso o token é lido do CORPO das respostas da API e guardado em memória
  // (ver csrfToken abaixo), e o interceptor de request o anexa. Deixamos o
  // mecanismo nativo do axios desligado para não haver dois caminhos
  // concorrentes escrevendo o mesmo header.
  withXSRFToken: false,
  timeout: 30_000,
})

/** Token de sessão em sessionStorage.
 *
 *  MEDIDA TEMPORÁRIA, e um recuo de segurança consciente. O certo é o cookie
 *  HttpOnly `byou_session`, que o JS não consegue ler — um XSS não rouba o que
 *  não alcança. Mas o cookie depende de front e API serem same-site, e hoje não
 *  são: `byou.website` vs `squareweb.app`. O navegador trata o cookie como de
 *  terceiros e o descarta, então toda requisição autenticada voltava 403.
 *
 *  O caminho definitivo é servir a API em `api.byou.website` (mesmo site do
 *  front), que faz o cookie voltar a funcionar sem nada disto. Depende de plano
 *  da hospedagem que permita domínio próprio. Ver TOKEN_TRANSITION.md.
 *
 *  `sessionStorage` e não `localStorage`: o token morre ao fechar a aba, em vez
 *  de ficar 24h no disco. Sobrevive a refresh, que é o que importa para a
 *  sessão continuar. Mesma exposição a XSS, janela menor.
 *
 *  Enquanto isto estiver de pé, um XSS em qualquer ponto do app equivale a
 *  vazar a sessão do usuário. */
const TOKEN_KEY = 'byou_session'

/** sessionStorage lança em contextos restritos (modo privado de alguns
 *  navegadores, cookies de site bloqueados). Falhar aqui não pode derrubar o
 *  app: sem token o usuário só é tratado como anônimo. */
function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

let sessionToken: string | null = readStoredToken()

export function setSessionToken(token: string | null | undefined): void {
  if (typeof token !== 'string' || token.length === 0) return

  sessionToken = token
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Sem persistência o token vale só para esta carga da página; a sessão
    // funciona e se perde no refresh. Melhor que impedir o login.
  }
}

export function clearSessionToken(): void {
  sessionToken = null
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // nada a fazer: a variável em memória já foi limpa
  }
}

export function hasSessionToken(): boolean {
  return sessionToken !== null
}

/** Token CSRF da sessão, mantido só em memória.
 *
 *  Não vai para localStorage de propósito: o cookie de sessão é HttpOnly
 *  justamente para que um XSS não consiga roubar credencial, e persistir o
 *  token CSRF em storage legível por JS devolveria ao atacante metade do par.
 *  Perder o token num refresh é aceitável — o boot do app o repõe. */
let csrfToken: string | null = null

export function setCsrfToken(token: string | null | undefined): void {
  if (typeof token === 'string' && token.length > 0) csrfToken = token
}

export function clearCsrfToken(): void {
  csrfToken = null
}

/** Busca o token para a sessão atual. Chamado no boot e após um 403 de escrita,
 *  que é o sintoma de token ausente ou rotacionado pelo servidor. */
export async function refreshCsrfToken(): Promise<void> {
  try {
    const { data } = await http.get<CsrfTokenResponse>('/auth/csrf')
    setCsrfToken(data?.csrfToken)
  } catch {
    // Sem token as escritas falham com 403 e a interface mostra o erro normal;
    // não há o que fazer aqui além de não derrubar o boot do app.
  }
}

const CSRF_SAFE_METHODS = new Set(['get', 'head', 'options', 'trace'])

http.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase()

  // O header é o que autentica em produção, onde o cookie é descartado por ser
  // de terceiros. Onde o cookie funciona ele também vai, e o backend aceita os
  // dois — o header tem precedência.
  if (sessionToken) {
    config.headers.set('Authorization', `Bearer ${sessionToken}`)
  }

  // Só faz sentido quando a sessão vem por cookie: o backend dispensa o CSRF de
  // quem se autentica por header. Mandar junto é inofensivo e mantém o fluxo
  // por cookie funcionando sem um segundo caminho de código.
  if (!CSRF_SAFE_METHODS.has(method) && csrfToken) {
    config.headers.set('X-XSRF-TOKEN', csrfToken)
  }

  return config
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
  502: 'O servidor está indisponível no momento. Tente de novo em instantes.',
  503: 'O servidor está indisponível no momento. Tente de novo em instantes.',
  504: 'O servidor demorou demais para responder. Tente de novo em instantes.',
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

    // A mensagem do servidor só é exibida nos status em que ela é de NEGÓCIO
    // ("categoria já existe", "arquivo grande demais") — casos em que o texto
    // do backend é mais útil que qualquer fallback nosso.
    //
    // Em 5xx ela é descartada: `ExceptionResponse.message` de um erro não
    // tratado carrega a mensagem da exceção do Spring, que pode trazer nome de
    // tabela/coluna, fragmento de SQL, caminho de classe ou host do storage — e
    // isso ia direto para a tela do usuário via toErrorMessage(). Detalhe de
    // implementação não é mensagem de erro; serve de mapa para quem sonda.
    // 413 é a exceção dentro dos 4xx: a mensagem do backend é um texto FIXO
    // ("...maximum allowed size of 5 GB.") compartilhado pelos dois limites, e
    // nenhum dos dois é 5 GB. Exibi-la fazia a tela mentir o tamanho aceito.
    // O fallback nosso é genérico de propósito; quem sabe QUAL limite estourou
    // é o fluxo de upload, que dá a mensagem específica (ver services.ts).
    const apiMessage = typeof data?.message === 'string' ? data.message.trim() : ''
    const trustApiMessage = status < 500 && status !== 413
    return Promise.reject(
      new ApiError(
        (trustApiMessage ? apiMessage : '') ||
          FALLBACK_BY_STATUS[status] ||
          'Algo deu errado.',
        status,
      ),
    )
  },
)

/** Mensagem segura para exibir ao usuário, venha o erro de onde vier. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Algo deu errado. Tente novamente.'
}
