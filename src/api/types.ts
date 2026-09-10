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

/** POST /auth/login não devolve o token de SESSÃO no corpo: ele vai só no
 *  header Set-Cookie (byou_session, HttpOnly), nunca no JSON — senão o HttpOnly
 *  perderia o sentido, e um script malicioso leria a sessão pela resposta.
 *
 *  O corpo carrega apenas o token CSRF, que é público por natureza (vai num
 *  header a cada escrita) e inútil sem o cookie de sessão. Ele vem no corpo
 *  porque o front está em outro domínio e não consegue ler o cookie
 *  XSRF-TOKEN por JS — ver client.ts. */
export interface UserLoginResponse {
  /** Token de sessão (JWT). Vem no corpo porque o cookie HttpOnly é descartado
   *  pelo navegador em produção, onde front e API não são same-site. Guardado em
   *  sessionStorage e enviado no header Authorization — MEDIDA TEMPORÁRIA, ver
   *  client.ts e TOKEN_TRANSITION.md. */
  token: string
  csrfToken: string
}

/** GET /auth/csrf — token CSRF da sessão atual, para o boot do app. */
export interface CsrfTokenResponse {
  csrfToken: string
}

/** POST /auth/register — todos os campos são NOT NULL no banco (ver notas). */
export interface UserRegisterRequest {
  name: string
  /** O backend nao exige mais sobrenome. Continua `string` e nao opcional: a
   *  coluna e NOT NULL, entao quem nao informa vai com `""` — omitir o campo
   *  causaria 500. Todo lugar que exibe "nome + sobrenome" precisa tolerar o
   *  vazio (ver o `join`/`filter` em AdminPage e CommentSection). */
  surname: string
  email: string
  password: string
  /** `YYYY-MM-DD`. Obrigatorio: o backend recusa o cadastro abaixo de 13 anos
   *  completos (422) e responde 400 quando o campo nao vem. */
  dateOfBirth: string
  /** Aceite dos termos de uso e da politica de privacidade. Precisa ser `true`:
   *  ausente, null ou false recusam o cadastro com 422. O servidor grava a
   *  declaracao junto da versao vigente dos documentos e do instante do aceite,
   *  entao o front precisa exibir os dois textos ANTES de marcar isto. */
  acceptedPolicies: boolean
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

/** PUT /auth/users/verify-account/{email} — concede ou remove o selo.
 *
 *  O nome do campo NÃO é `userIsVerified` (o da resposta): aqui o backend
 *  espera `isVerifyAccount`. Escrever o nome da resposta faz o campo chegar
 *  ausente, e o servidor responde 200 **sem mudar nada** — a tela mostraria
 *  sucesso sobre um estado que não existe no banco. Por isso o valor vai
 *  sempre explícito, nunca omitido para "manter como está". */
export interface UserUpdateVerifyAccountRequest {
  isVerifyAccount: boolean
}

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
  /** Se o titular aceitou os termos e a politica no cadastro. Contas criadas
   *  antes da coleta desse aceite podem vir `false`. */
  acceptTerms: boolean
  typeAccount: UserTypeAccount
  userAuth: UserAuth
  /** Selo de verificado da conta. Nasce `false` no cadastro e só muda por
   *  PUT /auth/users/verify-account/{email}, que é exclusivo de ADMIN — o
   *  PUT /auth/users/{email} (perfil) IGNORA este campo, dito no Swagger.
   *
   *  O campo já chega também em outras rotas relevantes hoje: perfil público,
   *  vídeo e comentários. Mantém `?` para compatibilidade com backends mais
   *  antigos, mas a regra correta na UI é ler o valor quando a resposta o
   *  envia e tratar `undefined` como "não sei", nunca como `false`. */
  userIsVerified?: boolean
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
 *  os dois tipos por causa disso.
 *
 *  O campo `userIsVerified` já chega nesta rota em 2026-09-10; continua opcional
 *  para manter compatibilidade com versões anteriores do backend. */
export interface PublicUserResponse {
  /** Id do próprio usuário retornado (confirma quem é o dono do perfil). */
  userId: number
  name: string
  surname: string
  typeAccount: UserTypeAccount
  /** Selo de verificado do perfil público. A rota já entrega o valor em
   *  2026-09-10, então a UI pode exibir imediatamente sem depender do cache de
   *  admin. Mantém `?` para compatibilidade com versões antigas do backend. */
  userIsVerified?: boolean
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
  /** Selo de verificado do criador, já entregue por GET /video em 2026-09-10. */
  userIsVerified?: boolean
  language: string
  uploadDate: string
  views: number
  status: VideoStatus
}

/** Campo `metadata` de POST /video/upload-url.
 *
 *  Vai como STRING JSON dentro do multipart (não como objeto) — a API
 *  desserializa o texto. Ver `videoApi.requestUploadUrl`.
 *
 *  Mudou junto com a arquitetura de upload (2026-08-23): o DTO antigo tinha
 *  `titulo`, `language` e `status`. Nenhum dos três existe mais aqui:
 *   - `title` agora é em inglês e sem o "t" dobrado do VideoResponse;
 *   - `status` saiu porque o vídeo nasce sempre DRAFT e só ganha status real
 *     no passo 3 (confirm), depois que o arquivo comprovadamente chegou;
 *   - `language` deixou de ser aceito.
 *
 *  `contentType` NÃO é decorativo: ele entra na assinatura da URL e precisa ser
 *  byte a byte igual ao `Content-Type` do PUT do passo 2, senão o storage
 *  recusa com SignatureDoesNotMatch. */
export interface VideoUploadMetadata {
  title: string
  description: string
  /** Qualquer `video/*`. Define a extensão do objeto salvo no storage. */
  contentType: string
  /** Tamanho do arquivo em bytes — `file.size` cru do input.
   *
   *  OBRIGATÓRIO desde a mudança de 2026-08-31: sem ele o passo 1 é rejeitado
   *  com 413, antes mesmo de a URL ser liberada. Por isso não é opcional aqui,
   *  mesmo sendo um campo novo — um `?` deixaria o compilador aceitar a
   *  chamada que o servidor recusa.
   *
   *  Declarar menos que o arquivo real não engana ninguém: a confirmação
   *  (passo 3) confere o tamanho de verdade no storage e derruba o vídeo. */
  fileSize: number
}

/** Resposta de POST /video/upload-url — o passo 1 dos três do upload.
 *
 *  `uploadUrl` é uma URL ASSINADA do storage, válida por 60 minutos (30 em
 *  ambiente local), e é o destino do PUT do passo 2. Ela não aponta para a
 *  API: não mandar cookie nem X-XSRF-TOKEN nesse PUT (ver
 *  `videoApi.putToStorage`). */
export interface VideoUploadResponse {
  uploadUrl: string
  /** Id do vídeo criado como DRAFT — é o `{id}` de POST /video/{id}/confirm. */
  videoId: number
  /** Chave do objeto no storage. Informativo; o front não precisa dela. */
  videoKey: string
}

export interface VideoUpdateStatusRequest {
  id: number
  videoStatus: VideoStatus
}

/** Status aceitos ao CONFIRMAR um upload (POST /video/{id}/confirm).
 *
 *  Recorte proposital de VideoStatus: PROCESSING é reservado ao servidor e
 *  DELETED tem rota própria — os dois voltam 409. Deixar o tipo largo
 *  permitiria uma tela oferecer uma opção que o backend recusa.
 *
 *  DRAFT entrou em 2026-08-31. Antes o confirm não o aceitava e o fluxo
 *  simplesmente PULAVA o passo 3 para rascunhos — o que também pulava as duas
 *  únicas verificações que o confirm faz: que o arquivo chegou mesmo ao
 *  storage e que o tamanho real cabe no limite. Um rascunho cujo PUT falhou em
 *  silêncio ficava salvo como se estivesse íntegro.
 *
 *  Os três status foram verificados contra a API rodando (2026-08-31):
 *  PUBLISHED, DRAFT e PRIVATE respondem 200; PROCESSING e DELETED respondem
 *  409 "The current video status does not allow this transition". A nota de
 *  release cita só PUBLISHED e DRAFT como aceitos, mas PRIVATE passa — a lista
 *  de lá está incompleta, não errada. */
export type VideoConfirmStatus = Extract<VideoStatus, 'PUBLISHED' | 'DRAFT' | 'PRIVATE'>

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
  /** Selo de verificado do autor, entregue junto com o comentário em 2026-09-10. */
  userIsVerified?: boolean
  dataComment: string
  likes: number
}

/** Reacao que ACOMPANHA a nota em POST /feedback/{videoId}.
 *
 *  Complemento da nota, nao substituto: o backend aceita o campo ausente ou
 *  null desde que `rating` venha. Por isso ele e opcional no request. */
export type FeedbackReactionType = 'LIKE' | 'DISLIKE'

/** POST /feedback/{videoId} — a avaliacao do usuario logado para um video.
 *
 *  `rating` e obrigatorio e o backend valida a faixa 1..5 (fora dela, 400).
 *  A mesma faixa esta em `feedbackSchema` (lib/validation.ts), para o erro
 *  aparecer no formulario antes de gastar uma request.
 *
 *  Cada usuario avalia um video UMA vez: a segunda tentativa responde 409. E
 *  por isso que a UI precisa saber se ja existe avaliacao antes de oferecer o
 *  formulario — ver `useMyVideoFeedback` (hooks/useFeedback.ts). Para trocar a
 *  nota, apaga-se a anterior (DELETE) e envia-se outra. */
export interface FeedbackRequest {
  /** Inteiro de 1 a 5. */
  rating: number
  feedbackReactionType?: FeedbackReactionType | null
}

/** Resposta de POST /feedback/{videoId} e item de GET /feedback/getFeedbacks.
 *
 *  Traz o video e o usuario ANINHADOS (objetos completos, nao ids) — e o unico
 *  jeito de saber de quem e cada avaliacao, ja que nao existe rota
 *  `/feedback/meus` nem filtro por video.
 *
 *  ATENCAO aos nomes fora do padrao: `data_feedBack` (snake_case com B
 *  maiusculo) e `LastUpdate` (PascalCase) sao os nomes REAIS serializados
 *  pelo backend, verificados ao vivo em 2026-08-27. Escrever `lastUpdate`
 *  aqui devolve undefined em silencio, sem erro de tipo. */
export interface FeedbackResponse {
  id: number
  rating: number
  /** Data (sem hora), formato "2026-08-27". */
  data_feedBack: string
  /** ISO com hora. Nome em PascalCase de proposito — ver nota do tipo. */
  LastUpdate: string
  feedbackReactionType: FeedbackReactionType | null
  /** Contador de versao do JPA. Nao tem uso na UI. */
  version: number
  videoResponse: VideoResponse
  userResponse: UserResponse
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
