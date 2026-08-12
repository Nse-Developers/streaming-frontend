// Tipos espelhando exatamente os DTOs do backend (ver /v3/api-docs).
// Os nomes estranhos ("tittle", "videId") são os nomes REAIS que a API
// devolve — não corrigir aqui, ou o parse silenciosamente vira undefined.

export type UserTypeAccount = 'CREATORS' | 'VIEWERS'
export type UserAuth = 'ADMIN' | 'USER'
export type VideoStatus = 'PROCESSING' | 'PUBLISHED' | 'PRIVATE' | 'DRAFT' | 'DELETED'

/** POST /auth/login */
export interface UserLoginRequest {
  email: string
  password: string
}

/** POST /auth/login não devolve corpo desde a migração para cookie HttpOnly:
 *  o token vai só no header Set-Cookie, nunca no JSON (senão o cookie HttpOnly
 *  perderia o sentido — um script malicioso leria o token pela resposta). */
export type UserLoginResponse = void

/** POST /auth/register — todos os campos são NOT NULL no banco (ver notas). */
export interface UserRegisterRequest {
  name: string
  surname: string
  email: string
  password: string
  bio: string
  profilePhoto: string
  state: string
  country: string
  linkInstagram: string
  linkYoutube: string
  linkWebsite: string
  userTypeAccount: UserTypeAccount
}

/** PUT /auth/users/{email} — merge PARCIAL (verificado ao vivo em 2026-08-09:
 *  enviar só `{bio}` preservou state e country). Por isso todo campo é
 *  opcional: manda-se apenas o que mudou, e o que ficar de fora permanece
 *  como está no banco.
 *
 *  `email`, `password` e `userTypeAccount` são aceitos pelo DTO mas IGNORADOS
 *  pelo service — não existe troca de e-mail, senha ou tipo de conta por aqui.
 *  Ficam fora do tipo de propósito, para não induzir UI que não funciona. */
export type UserUpdateRequest = Partial<
  Omit<UserRegisterRequest, 'email' | 'password' | 'userTypeAccount'>
>

/** GET /auth/me, GET /auth/users, POST /auth/register.
 *
 *  Os papéis vêm no UserResponse para que /auth/me sozinho baste para saber o
 *  que o usuário pode fazer (antes vinha do payload do JWT, que não é mais
 *  legível no cliente — o cookie é HttpOnly).
 *
 *  ATENÇÃO ao nome do campo: o backend serializa `typeAccount` (sem o prefixo
 *  "user"), diferente de `userAuth`. Verificado ao vivo — usar
 *  `userTypeAccount` aqui faz o papel virar undefined e todo criador ser
 *  tratado como espectador. */
export interface UserResponse {
  id: number
  name: string
  surname: string
  email: string
  typeAccount: UserTypeAccount
  userAuth: UserAuth
  bio: string
  profilePhoto: string
  state: string
  country: string
  linkInstagram: string
  linkYoutube: string
  linkWebsite: string
  /** ISO. Só informativo — nada na UI depende dele hoje. */
  registrationDate: string
}

/** GET /video, GET /video/{id}, GET /video/users/videos.
 *
 *  O nome do campo de id JÁ MUDOU DUAS VEZES no backend: era ausente, virou
 *  `video_id`, e hoje é `videId` (sem o "o" — nome real do record, verificado
 *  em 2026-08-09). Os três continuam declarados e opcionais aqui porque um
 *  backend não atualizado ainda manda o nome antigo, e ler o nome errado não
 *  dá erro: vira `undefined` e o vídeo silenciosamente perde link, botão de
 *  publicar e botão de excluir.
 *
 *  Nada no app deve ler estes campos direto — use `id` de UiVideo
 *  (lib/video.ts), que resolve a variação num lugar só.
 *  `videoUrl` agora É devolvido; segue opcional pela mesma razão. */
export interface VideoResponse {
  /** Nome atual (2026-08-09). */
  videId?: number
  /** Nome anterior, ainda aceito na leitura. */
  video_id?: number
  tittle: string
  description: string
  thumbnailUrl: string
  videoUrl?: string
  creatorName: string
  language: string
  uploadDate: string
  views: number
  status: VideoStatus
}

export interface VideoUploadMetadata {
  titulo: string
  description: string
  status: VideoStatus
  language: string
}

export interface VideoUpdateStatusRequest {
  id: number
  videoStatus: VideoStatus
}

export interface CategoryRequest {
  name: string
  description: string
  icon: string
}

export type CategoryResponse = CategoryRequest

export interface CommentResponse {
  id: number
  text: string
  dataComment: string
  version: number
  likes: number
}

export interface NumberOfFollowersResponse {
  followers: number
}

export interface CreatedResponse {
  status: number
  action: string
  message: string
}

export type DeletedResponse = CreatedResponse

export interface ExceptionResponse {
  status: number
  error: string
  message: string
}
