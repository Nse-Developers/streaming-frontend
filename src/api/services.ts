import { ApiError, http } from './client'
import type {
  CategoryRequest,
  CategoryResponse,
  CommentResponse,
  CreatedResponse,
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
  VideoStatus,
  VideoUploadMetadata,
} from './types'

/* ---------------------------------------------------------------- auth */

export const authApi = {
  /** O login não devolve o usuário nem o token no corpo — só o Set-Cookie
   *  (byou_session, HttpOnly). Depois de chamar isto, use authApi.me() para
   *  saber quem entrou. */
  async login(body: UserLoginRequest): Promise<void> {
    try {
      await http.post<UserLoginResponse>('/auth/login', body)
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
    await http.post('/auth/logout')
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

  /** O backend espera `metadata` como STRING JSON na query, e os arquivos como
   *  multipart. Os dois arquivos são obrigatórios (sem thumbnail => 400). */
  async upload(
    metadata: VideoUploadMetadata,
    file: File,
    thumbnail: File,
    onProgress?: (percent: number) => void,
  ) {
    const form = new FormData()
    form.append('file', file)
    form.append('thumbnail', thumbnail)

    const { data } = await http.post<CreatedResponse>('/video/upload', form, {
      params: { metadata: JSON.stringify(metadata) },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0, // upload de vídeo pode ser longo; sem timeout artificial
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return
        onProgress(Math.round((event.loaded * 100) / event.total))
      },
    })
    return data
  },

  async updateStatus(id: number, videoStatus: VideoStatus) {
    const { data } = await http.patch<CreatedResponse>('/video/update/status', {
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

  /** ATENÇÃO: o path diz {videoId} e o backend apaga por vídeo, não por
   *  comentário — por isso a UI não expõe "excluir comentário" individual. */
  async removeByVideo(videoId: number) {
    const { data } = await http.delete<DeletedResponse>(`/comments/${videoId}`)
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
