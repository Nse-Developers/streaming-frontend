import axios from 'axios'
import {
  ApiError,
  clearCsrfToken,
  clearSessionToken,
  http,
  setCsrfToken,
  setSessionToken,
} from './client'
import {
  MAX_THUMB_LABEL,
  MAX_VIDEO_LABEL,
  safeExternalUrl,
} from '@/lib/validation'
import type {
  CategoryRequest,
  CategoryResponse,
  CommentResponse,
  CreatedResponse,
  FeedbackRequest,
  FeedbackResponse,
  DeletedResponse,
  FollowResponse,
  NumberOfFollowersResponse,
  PublicUserResponse,
  UserLoginRequest,
  UserLoginResponse,
  UserRegisterRequest,
  UserResponse,
  UserUpdateRequest,
  VideoResponse,
  VideoConfirmStatus,
  VideoStatus,
  VideoUploadMetadata,
  VideoUploadResponse,
} from './types'

/* ---------------------------------------------------------------- auth */

export const authApi = {
  /** O login não devolve o usuário nem o token de SESSÃO no corpo — a sessão vai
   *  só no Set-Cookie (byou_session, HttpOnly). Depois de chamar isto, use
   *  authApi.me() para saber quem entrou.
   *
   *  O corpo traz apenas o token CSRF, que precisa ser legível por JS por
   *  definição (é ecoado num header). Ele não dá acesso a nada sozinho: sem o
   *  cookie de sessão, não autentica. */
  async login(body: UserLoginRequest): Promise<void> {
    try {
      const { data } = await http.post<UserLoginResponse>('/auth/login', body)
      // O token de sessão vem no corpo porque o cookie não sobrevive à política
      // de terceiros — ver client.ts. Guardar ANTES do csrf: é ele que
      // autentica as requisições seguintes.
      setSessionToken(data?.token)
      // O servidor rotaciona o token CSRF ao autenticar: guardar o novo é o que
      // faz as escritas seguintes passarem quando a sessão vem por cookie.
      setCsrfToken(data?.csrfToken)
    } catch (error) {
      // A API responde 403 para senha errada e 404 para e-mail inexistente.
      // As duas viram a MESMA mensagem: distinguir permitiria descobrir quais
      // e-mails têm conta (enumeração de usuários). "Sem permissão", a mensagem
      // padrão do 403, também não faz sentido numa tela de login.
      if (error instanceof ApiError && [400, 401, 403, 404].includes(error.status)) {
        throw new ApiError('E-mail ou senha incorretos.', error.status)
      }
      throw error
    }
  },

  /** Quem está logado, segundo o cookie de sessão atual. 401/403 = ninguém. */
  async me() {
    const { data } = await http.get<UserResponse>('/auth/me')
    return data
  },

  /** Invalida o cookie no servidor (Set-Cookie com maxAge 0). Sem isto, o
   *  front não teria como apagar um cookie HttpOnly — só o backend pode. */
  async logout() {
    try {
      await http.post('/auth/logout')
    } finally {
      // Limpa mesmo se a chamada falhar: o usuário pediu para sair, e manter o
      // token no storage deixaria a sessão viva no navegador dele. O JWT segue
      // válido no servidor até expirar (não há revogação), então descartá-lo
      // localmente é o que efetiva o logout.
      clearSessionToken()
      clearCsrfToken()
    }
    // O erro sobe de propósito: esta camada relata o que a API respondeu. Quem
    // decide que "sair não pode falhar" é o AuthContext, que trata o erro lá.
  },

  async register(body: UserRegisterRequest) {
    try {
      const { data } = await http.post<UserResponse>('/auth/register', body)
      return data
    } catch (error) {
      // A API responde 409 "User Already Exist" (em inglês) neste caso.
      if (error instanceof ApiError && error.status === 409) {
        throw new ApiError('Já existe uma conta com este e-mail.', 409)
      }
      // 422 é a recusa das políticas. O formulário já barra as duas condições,
      // então chegar aqui significa relógio do cliente atrasado ou requisição
      // fora da tela — mas a mensagem ainda precisa dizer QUAL das duas falhou.
      // O backend responde em inglês ("The user is not old enough." / "The user
      // did not accept the terms."), verificado ao vivo em 2026-08-29.
      if (error instanceof ApiError && error.status === 422) {
        const isAge = /old enough/i.test(error.message)
        throw new ApiError(
          isAge
            ? 'É preciso ter 13 anos ou mais para criar uma conta.'
            : 'É preciso aceitar os termos de uso e a política de privacidade.',
          422,
        )
      }
      throw error
    }
  },

  /** GET /auth/user/{id} — perfil público de outro usuário.
   *
   *  Caminho no SINGULAR (`/auth/user/`), diferente de `/auth/users` (plural,
   *  só ADMIN). São rotas distintas com permissões distintas: esta exige apenas
   *  sessão (CREATORS ou VIEWERS), e é a única que um espectador pode usar para
   *  ver o perfil de alguém.
   *
   *  O 404 vira mensagem em português porque cai direto na tela de perfil: a
   *  mensagem crua do backend apareceria para o usuário final. */
  async getUserById(id: number) {
    try {
      const { data } = await http.get<PublicUserResponse>(`/auth/user/${id}`)
      return data
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new ApiError('Este perfil não existe ou foi removido.', 404)
      }
      throw error
    }
  },

  /** Requer papel ADMIN (SecurityConfig: GET /auth/users -> hasRole ADMIN). */
  async listUsers() {
    const { data } = await http.get<UserResponse[]>('/auth/users')
    return data
  },

  /** PUT completo: o backend não faz merge parcial, então envie todos os campos. */
  async updateUser(email: string, body: UserUpdateRequest) {
    const { data } = await http.put<UserResponse>(`/auth/users/${encodeURIComponent(email)}`, body)
    return data
  },

  async deleteUser(email: string) {
    const { data } = await http.delete<DeletedResponse>(
      `/auth/users/${encodeURIComponent(email)}`,
    )
    return data
  },
}

/* --------------------------------------------------------------- video */

export const videoApi = {
  async listAll() {
    const { data } = await http.get<VideoResponse[]>('/video')
    return data
  },

  async getById(id: number) {
    const { data } = await http.get<VideoResponse>(`/video/${id}`)
    return data
  },

  /** Vídeos de um criador filtrados por status (query params, não body). */
  async listByUserAndStatus(email: string, status: VideoStatus) {
    const { data } = await http.get<VideoResponse[]>('/video/users/videos', {
      params: { email, status },
    })
    return data
  },

  /** Passo 1 de 3 — pede a URL assinada e sobe a THUMBNAIL (só ela passa pela
   *  API). O vídeo nasce `DRAFT` e fica invisível até o passo 3.
   *
   *  `metadata` vai como string JSON num campo do multipart, não como objeto:
   *  a API lê o campo como texto e desserializa. */
  async requestUploadUrl(metadata: VideoUploadMetadata, thumbnail: File) {
    const form = new FormData()
    form.append('thumbnail', thumbnail)
    form.append('metadata', JSON.stringify(metadata))

    try {
      const { data } = await http.post<VideoUploadResponse>('/video/upload-url', form, {
        // Sem Content-Type explícito: o browser precisa gerar o boundary do
        // multipart sozinho. Fixar 'multipart/form-data' na mão omite o
        // boundary e o Spring não consegue separar as partes.
        headers: { 'Content-Type': undefined },
      })
      return data
    } catch (error) {
      // Um 413 aqui é o vídeo ou a thumbnail passando do limite. O texto do
      // backend é fixo e cita um tamanho errado (ver client.ts), então a
      // mensagem sai daqui — e cita os DOIS limites porque a resposta não diz
      // qual dos dois estourou.
      if (error instanceof ApiError && error.status === 413) {
        throw new ApiError(
          `Arquivo grande demais. O vídeo pode ter até ${MAX_VIDEO_LABEL} e a capa até ${MAX_THUMB_LABEL}.`,
          413,
        )
      }
      throw error
    }
  },

  /** Passo 2 de 3 — manda o arquivo DIRETO ao storage, sem passar pela API.
   *
   *  Usa um axios cru (`axios.put`), não a instância `http`, por três motivos
   *  que são de segurança, não de estilo:
   *
   *  1. `http` tem `withCredentials: true`. Esta URL é de outro host (o
   *     storage), então o cookie de sessão `byou_session` seria enviado a um
   *     serviço que não é a API — vazamento de credencial para fora do
   *     destinatário pretendido, e quebra do CORS de quebra.
   *  2. `http` tem `baseURL` e `xsrfHeaderName`. O token CSRF não tem uso no
   *     storage e vira só mais um header a estourar o preflight.
   *  3. O `Content-Type` aqui é parte da ASSINATURA da URL. Precisa ser
   *     idêntico ao `contentType` enviado no metadata do passo 1 — por isso
   *     ele é parâmetro explícito, e não `file.type` lido de novo aqui: os
   *     dois passos têm que concordar sobre uma única string.
   *
   *  Sem timeout de propósito, mesmo com a URL expirando em 60 min: o storage
   *  valida a assinatura ao ABRIR a request, não durante, então um envio que
   *  atravessa o prazo ainda conclui. Um teto de 60 min no cliente mataria
   *  justamente o upload lento que terminaria bem — 1 GiB a 2 Mbps leva ~70
   *  min. Quem interrompe é o botão de cancelar, via `signal`. */
  async putToStorage(
    uploadUrl: string,
    file: File,
    contentType: string,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
  ) {
    // A URL vem da resposta da API, mas é o único lugar do app onde um valor
    // do servidor vira o DESTINO de uma request com conteúdo do usuário — em
    // todos os outros ele só vira src/href. Um valor inesperado aqui manda o
    // arquivo para outro host, então o formato é conferido antes do envio:
    //
    //  - só http(s): descarta esquemas que não deveriam chegar aqui;
    //  - em produção, só https: um downgrade para http faria o vídeo e a
    //    assinatura da URL (que é uma credencial temporária) trafegarem em
    //    claro. Em dev o storage local roda em http, por isso a exceção.
    const parsed = safeExternalUrl(uploadUrl)
    if (!parsed || (!import.meta.env.DEV && !parsed.startsWith('https://'))) {
      throw new ApiError('O servidor devolveu um destino de upload inválido.', 0)
    }

    try {
      await axios.put(parsed, file, {
        headers: { 'Content-Type': contentType },
        withCredentials: false,
        timeout: 0,
        signal,
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) return
          onProgress(Math.round((event.loaded * 100) / event.total))
        },
      })
    } catch (error) {
      // Este `axios.put` é cru de propósito (ver acima), então NÃO passa pelo
      // interceptor de `http` — sem este catch, o erro chegaria à tela como
      // "Request failed with status code 403" em inglês, ou pior: o corpo de
      // erro do storage (S3/R2) é um XML que expõe bucket, chave do objeto e endpoint do
      // storage. Nada disso deve virar texto na tela do usuário.
      if (axios.isCancel(error)) throw new ApiError('Envio cancelado.', 0)
      const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0
      throw new ApiError(
        status === 403
          ? // 403 aqui é assinatura inválida ou URL vencida (60 min, 30 em
            // ambiente local), nunca
            // permissão do usuário — a ação certa é refazer o envio, não pedir
            // acesso a alguém.
            'O link de envio expirou. Tente enviar o vídeo novamente.'
          : 'Falha ao enviar o arquivo de vídeo. Verifique sua conexão e tente novamente.',
        status,
      )
    }
  },

  /** Passo 3 de 3 — confirma que o arquivo chegou e aplica o status final.
   *
   *  Faz DUAS verificações que não existem em nenhum outro lugar: que o objeto
   *  existe mesmo no storage, e que o tamanho REAL do arquivo cabe no limite
   *  (o `fileSize` do passo 1 é só uma declaração do cliente). Por isso vale
   *  para rascunho também, e só depois de o PUT ter retornado 200.
   *
   *  Os três status de erro daqui precisam de texto próprio: os fallbacks
   *  genéricos por código ("Não encontramos o que você procura", "Essa ação já
   *  foi feita antes") não dizem nada a quem acabou de esperar um upload
   *  inteiro, e nenhum deles indica o que fazer em seguida. */
  async confirmUpload(id: number, videoStatus: VideoConfirmStatus) {
    try {
      const { data } = await http.post<CreatedResponse>(`/video/${id}/confirm`, {
        id,
        videoStatus,
      })
      return data
    } catch (error) {
      if (!(error instanceof ApiError)) throw error

      // O arquivo real passou do limite. O backend já apagou vídeo e
      // thumbnail do storage e marcou o registro como DELETED — não adianta
      // repetir o PUT, o fluxo recomeça do zero. A mensagem tem que dizer
      // isso, senão o usuário fica tentando "de novo" num id que morreu.
      if (error.status === 413) {
        throw new ApiError(
          `O arquivo enviado passa de ${MAX_VIDEO_LABEL}. O envio foi descartado — selecione um vídeo menor e comece de novo.`,
          413,
        )
      }

      // 404 aqui quase nunca é "id não existe": é o objeto não ter chegado ao
      // storage. Como o PUT do passo 2 só passa daqui com 2xx, sobra a URL
      // vencida no meio do envio.
      if (error.status === 404) {
        throw new ApiError(
          'O arquivo não chegou ao servidor. Tente enviar o vídeo novamente.',
          404,
        )
      }

      if (error.status === 409) {
        throw new ApiError(
          'O servidor recusou o status escolhido para este vídeo.',
          409,
        )
      }

      throw error
    }
  },

  /** Troca o status de um vídeo JÁ confirmado (ex.: tirar do ar).
   *
   *  Não serve para o fluxo de upload — ali o status vem do confirm. Aqui o
   *  `id` vai no CORPO, não na URL, ao contrário do confirm. O backend recusa
   *  com 409 a ida para DELETED/PROCESSING ou para o status atual. */
  async updateStatus(id: number, videoStatus: VideoStatus) {
    const { data } = await http.patch<VideoResponse>('/video/update/status', {
      id,
      videoStatus,
    })
    return data
  },

  async remove(id: number) {
    const { data } = await http.delete<DeletedResponse>(`/video/${id}`)
    return data
  },
}

/* ------------------------------------------------------------ category */

/** Categorias vivem sob /category (o controller usava @RequestMapping(name=...),
 *  que não define path e jogava as rotas na raiz; corrigido no backend em
 *  2026-08-09 e verificado ao vivo). */
export const categoryApi = {
  async list() {
    const { data } = await http.get<CategoryResponse[]>('/category/creators')
    return data
  },

  async create(body: CategoryRequest) {
    const { data } = await http.post<CategoryResponse>('/category/create', body)
    return data
  },

  async update(name: string, body: CategoryRequest) {
    const { data } = await http.put<CategoryResponse>(
      `/category/${encodeURIComponent(name)}`,
      body,
    )
    return data
  },

  async remove(name: string) {
    const { data } = await http.delete<DeletedResponse>(`/category/${encodeURIComponent(name)}`)
    return data
  },
}

/* ------------------------------------------------------------- comments */

export const commentApi = {
  async list(videoId: number) {
    const { data } = await http.get<CommentResponse[]>(`/comments/${videoId}`)
    return data
  },

  async create(videoId: number, text: string) {
    const { data } = await http.post<CommentResponse>(`/comments/${videoId}`, { text })
    return data
  },

  /** DELETE /comments/{videoId} — apesar do nome do parâmetro na URL, o valor
   *  esperado é o **id do COMENTÁRIO** (`commentId` da listagem), não o id do
   *  vídeo. Isso está documentado explicitamente no Swagger do backend
   *  (verificado em 2026-08-27); a leitura anterior aqui era a oposta e apagaria
   *  o comentário errado se alguma tela tivesse chamado isto.
   *
   *  NÃO ESTÁ LIGADO A NENHUMA TELA, e de propósito: ao testar ao vivo com um
   *  comentário do PRÓPRIO usuário logado (ADMIN), a rota respondeu
   *  404 "Comment not found" mesmo com o comentário existindo na listagem. Ou
   *  seja: o contrato documentado e o comportamento real ainda não batem, e
   *  qual dos dois está certo é questão do backend.
   *
   *  Enquanto isso não se resolver, expor "excluir comentário" na UI daria um
   *  botão que só produz erro. O nome do parâmetro (`commentId`) segue o
   *  contrato documentado para que, quando o 404 for corrigido, ligar a UI seja
   *  só chamar isto — sem ter que redescobrir qual id vai na URL. */
  async removeComment(commentId: number) {
    const { data } = await http.delete<DeletedResponse>(`/comments/${commentId}`)
    return data
  },
}

export const commentLikeApi = {
  async count(commentId: number) {
    const { data } = await http.get<number>(`/commentLikes/${commentId}`)
    return typeof data === 'number' ? data : Number(data) || 0
  },

  async like(commentId: number) {
    await http.post(`/commentLikes/${commentId}`)
  },

  async unlike(commentId: number) {
    await http.delete(`/commentLikes/${commentId}`)
  },
}

/* ------------------------------------------------------------- feedback */

export const feedbackApi = {
  /** GET /feedback/getFeedbacks — avaliacoes da PLATAFORMA INTEIRA.
   *
   *  Sem filtro por video, sem filtro por usuario e sem paginacao: cada item
   *  vem com o video e o usuario aninhados por completo. O proprio Swagger
   *  avisa que a resposta fica pesada e recomenda uso administrativo.
   *
   *  Nao existe rota "minha avaliacao deste video", entao esta e a unica forma
   *  de descobrir se o usuario ja avaliou algo — o filtro acontece no cliente
   *  (ver `useMyVideoFeedback`).
   *
   *  Sem sessao responde 403; com sessao ADMIN, 200 (testado em 2026-08-27).
   *  NAO foi testado com um usuario comum, entao trate 403 aqui como possivel
   *  restricao de papel e nao como sessao expirada — e o que os hooks fazem. */
  async listAll() {
    const { data } = await http.get<FeedbackResponse[]>('/feedback/getFeedbacks')
    return data ?? []
  },

  /** POST /feedback/{videoId} — avalia um video como o usuario logado.
   *
   *  O 409 recebe mensagem propria porque nao e falha: significa que o usuario
   *  JA avaliou este video. A mensagem crua do backend vem em ingles e cairia
   *  direto na tela. Para trocar a nota e preciso remover a anterior primeiro. */
  async give(videoId: number, body: FeedbackRequest) {
    try {
      const { data } = await http.post<FeedbackResponse>(`/feedback/${videoId}`, body)
      return data
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        throw new ApiError('Você já avaliou este vídeo.', 409)
      }
      throw error
    }
  },

  /** DELETE /feedback/{videoId} — remove a avaliacao DO USUARIO LOGADO para
   *  este video (nao a de outra pessoa; o backend resolve o autor pela sessao).
   *
   *  O parametro e o id do VIDEO, nao o id da avaliacao — diferente de
   *  `FeedbackResponse.id`, que nao e usado em nenhuma rota. Depois de remover,
   *  o usuario pode avaliar de novo. */
  async remove(videoId: number) {
    await http.delete(`/feedback/${videoId}`)
  },
}

/* --------------------------------------------------------------- follow */

export const followApi = {
  /** Quantos seguidores este usuário tem.
   *
   *  O contador é o path SEM sufixo (`/follow/users/{id}`); `/following` é a
   *  lista de quem ele segue. Trocar um pelo outro não dá erro de tipo — só
   *  devolve a coisa errada (um objeto onde se espera array). */
  async followers(userId: number) {
    const { data } = await http.get<NumberOfFollowersResponse>(`/follow/users/${userId}`)
    return data.followers
  },

  /** Quem este usuário SEGUE.
   *
   *  Devolve só os `followedId`, que é o que a UI usa: o conjunto de perfis em
   *  que o botão deve mostrar "Seguindo". */
  async following(userId: number) {
    const { data } = await http.get<FollowResponse[]>(`/follow/users/${userId}/following`)
    return (data ?? []).map((item) => item.followedId)
  },

  async follow(followedId: number) {
    await http.post(`/follow/users/${followedId}/follow`)
  },

  async unfollow(followedId: number) {
    await http.post(`/follow/users/${followedId}/unfollow`)
  },
}
