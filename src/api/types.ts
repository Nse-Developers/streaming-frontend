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

/** GET /auth/user/{id} — perfil PÚBLICO de outro usuário.
 *
 *  Requer sessão: SecurityConfig exige hasAnyRole("CREATORS","VIEWERS").
 *
 *  É um DTO MENOR que UserResponse, não o mesmo objeto: não traz `id`, `email`,
 *  `userAuth`, `profilePhoto` nem `linkWebsite`. Isso é intencional — é o
 *  recorte que pode ser exibido a terceiros (e-mail de outra pessoa não é
 *  informação pública). Por isso tem tipo próprio em vez de
 *  `Partial<UserResponse>`: o que não vem aqui não existe para a tela pública.
 *
 *  ATENÇÃO ao nome do id: aqui é `userId`, enquanto em UserResponse (/auth/me)
 *  o mesmo dado se chama `id`. São records diferentes no backend — não unificar
 *  os dois tipos por causa disso. */
export interface PublicUserResponse {
  /** Id do próprio usuário retornado (confirma quem é o dono do perfil). */
  userId: number
  name: string
  surname: string
  typeAccount: UserTypeAccount
  bio: string
  state: string
  country: string
  linkInstagram: string
  linkYoutube: string
  /** ISO sem timezone (ex.: "2026-01-15T09:00:00"). */
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
  /** Id do CRIADOR do vídeo (não do vídeo!), para linkar o nome ao perfil
   *  público em /users/{userId}. Devolvido desde 2026-08-16.
   *
   *  Segue opcional para não quebrar contra um backend mais antigo: quando vem
   *  undefined, a UI mostra o nome como texto simples em vez de um link que
   *  daria 404 — ver `profilePath` em lib/video.ts.
   *
   *  Cuidado para não confundir com `videId`, que é o id do vídeo. Os dois são
   *  números e ficam lado a lado; trocar um pelo outro leva ao perfil errado. */
  userId?: number
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
  /** Id do PRÓPRIO comentário — alvo de POST/DELETE /commentLikes/{id}.
   *
   *  Chamava-se `id` até 2026-08-16. O nome novo é mais claro ao lado de
   *  `userId` (autor), mas cuidado: os dois são números e ficam colados no
   *  record, e trocar um pelo outro curte o comentário errado sem dar erro. */
  commentId: number
  text: string
  /** Nome e sobrenome do autor do comentário, em campos separados. Opcionais
   *  porque comentários antigos, criados antes de o backend passar a devolver o
   *  autor, podem vir sem eles. */
  nameUser?: string
  surnameUser?: string
  /** Id do AUTOR do comentário (não do comentário — esse é `id`), para linkar
   *  o nome ao perfil público. Devolvido desde 2026-08-16; opcional pela mesma
   *  razão de `VideoResponse.userId`. */
  userId?: number
  dataComment: string
  version: number
  likes: number
}

export interface NumberOfFollowersResponse {
  followers: number
}

/** GET /follow/users/{followerId}/following — quem o usuário SEGUE.
 *  Cada item é uma aresta da relação.
 *
 *  É o que permite o botão "Seguir/Seguindo" saber seu estado inicial: sem esta
 *  rota o front não teria como perguntar "eu sigo fulano?" e o botão voltaria a
 *  "Seguir" a cada F5, mesmo para quem já é seguido.
 *
 *  A lista já vem filtrada por `userAlreadyFollow = true` no backend, então
 *  quem foi deixado de seguir não aparece — não é preciso filtrar aqui. */
export interface FollowResponse {
  /** Quem segue — é sempre o usuário do path. */
  followerId: number
  /** Quem é seguido. É este que interessa: são os perfis com "Seguindo". */
  followedId: number
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
