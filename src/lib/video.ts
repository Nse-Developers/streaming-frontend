import type { VideoResponse } from '@/api/types'

/** Vídeo enriquecido para uso na UI.
 *
 *  `id` é o ponto ÚNICO de leitura do identificador. O backend já renomeou esse
 *  campo duas vezes (`video_id` -> `videId`), e como ler o nome errado devolve
 *  `undefined` em vez de dar erro, cada renomeação apagava silenciosamente o
 *  link do card, o botão de publicar e o de excluir. Resolvendo aqui, a próxima
 *  renomeação é uma linha em `readId` — e não uma caçada por 8 arquivos.
 *
 *  Continua opcional porque nem toda versão do backend manda id: quando falta,
 *  `key` cai numa chave derivada (só para servir de React key) e a UI esconde
 *  as ações que exigem id real.
 */
export interface UiVideo extends VideoResponse {
  /** Id real do vídeo, sob qualquer nome que o backend use. */
  id?: number
  /** Chave estável para uso em listas (React key). */
  key: string
  /** URL da thumbnail já validada (http/https) ou null. */
  safeThumbnail: string | null
}

/** Aceita os dois nomes já usados pelo backend para o id do vídeo. */
function readId(video: VideoResponse): number | undefined {
  return video.videId ?? video.video_id ?? undefined
}

/** Extrai o UUID do nome do objeto no storage:
 *  ".../creators-<uuid>--thumbnails-.png" -> "<uuid>"
 *
 *  O padrao sobreviveu a troca de MinIO por Cloudflare R2 (a chave do objeto
 *  nao mudou, so o host): conferido em 2026-08-27 contra os 17 videos de
 *  GET /video, todos com UUID extraido. So serve de React key quando o backend
 *  nao manda id — hoje ele manda. */
function thumbnailKey(url: string): string | null {
  const match = /creators-([0-9a-f-]{36})/i.exec(url)
  return match?.[1] ?? null
}

/** Hash curto e determinístico (FNV-1a) para os casos sem UUID na thumbnail. */
function hash(value: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false
  return /^https?:\/\//i.test(value)
}

export function toUiVideo(video: VideoResponse, index: number): UiVideo {
  const fromThumb = isHttpUrl(video.thumbnailUrl) ? thumbnailKey(video.thumbnailUrl) : null
  const id = readId(video)
  return {
    ...video,
    id,
    key:
      // Prioridade: id real da API > UUID extraído da thumbnail > hash do
      // conteúdo. As duas últimas são só para não quebrar a lista quando o
      // backend ainda não manda id; não servem para navegar ao detalhe.
      id != null
        ? String(id)
        : fromThumb ??
          `${hash(`${video.tittle}|${video.creatorName}|${video.uploadDate}`)}-${index}`,
    safeThumbnail: isHttpUrl(video.thumbnailUrl) ? video.thumbnailUrl : null,
  }
}

export function toUiVideos(videos: VideoResponse[] | undefined): UiVideo[] {
  return (videos ?? []).map(toUiVideo)
}

/** Caminho do perfil público de um usuário, ou null quando não dá para montar.
 *
 *  Ponto único que decide "o nome vira link ou fica como texto?". A rota
 *  (`GET /auth/user/{id}`) só aceita id numérico, e hoje nem vídeo nem
 *  comentário devolvem esse id — só o nome de exibição. Enquanto for assim,
 *  isto devolve null e a UI mostra texto simples, que é melhor do que um link
 *  que leva a um 404 ou, pior, ao perfil de outra pessoa.
 *
 *  Centralizado aqui para que, quando o backend passar a mandar o id, nenhuma
 *  tela precise mudar — e para que ninguém tente "resolver" o id pelo nome:
 *  nomes não são únicos, e adivinhar levaria ao perfil errado. */
export function profilePath(userId: number | null | undefined): string | null {
  return typeof userId === 'number' && Number.isInteger(userId) && userId > 0
    ? `/users/${userId}`
    : null
}

/** Vídeos que podem aparecer numa listagem PÚBLICA (feed da home, perfil de
 *  outra pessoa).
 *
 *  O backend é quem decide o que envia, mas o feed geral (`GET /video`) hoje
 *  devolve a lista inteira e a separação por visibilidade acabava recaindo
 *  sobre cada tela. Centralizar aqui garante que uma tela nova não esqueça o
 *  filtro — e que rascunho ou vídeo privado de terceiros não vaze na UI se o
 *  backend passar a mandá-los.
 *
 *  Só `PUBLISHED` passa: `DRAFT`/`PRIVATE` são do dono (vistos em "Meus
 *  vídeos", por `GET /video/users/videos`), e `PROCESSING`/`DELETED` não têm o
 *  que mostrar. Allowlist, não denylist: um status novo no backend fica
 *  invisível até alguém decidir o contrário, em vez de aparecer sozinho. */
export function isPubliclyVisible(video: Pick<VideoResponse, 'status'>): boolean {
  return video.status === 'PUBLISHED'
}

/** Aplica `isPubliclyVisible` a uma lista, tolerando `undefined` (query ainda
 *  carregando). */
export function publicVideos(videos: UiVideo[] | undefined): UiVideo[] {
  return (videos ?? []).filter(isPubliclyVisible)
}

/** Este vídeo pode ser exibido a ESTE usuário?
 *
 *  Complementa `isPubliclyVisible`, que decide o que entra numa LISTA. Aqui a
 *  pergunta é sobre um vídeo específico já carregado — o caso da tela de
 *  detalhe, onde o vídeo vem de `GET /video/{id}` e não passa por filtro algum.
 *
 *  Estado do backend em 2026-08-27 (reverificado — MUDOU desde 2026-08-23):
 *   - para um usuário comum, `GET /video/{id}` já responde 404 em vídeo
 *     PRIVATE/DRAFT de terceiro. A falha original foi corrigida lá;
 *   - para ADMIN, a rota AINDA devolve 200 com o vídeo e a URL assinada de
 *     reprodução de qualquer criador (testado com os ids 3 e 6, de outros
 *     donos). O feed (`GET /video`) tem o mesmo comportamento: filtra para
 *     usuário comum, mas entrega rascunho e privado alheios ao admin.
 *
 *  Por isso a função CONTINUA necessária, e a regra é posse — não papel: um
 *  admin ter permissão administrativa não é razão para o player abrir o
 *  rascunho não publicado de outra pessoa. Sem isto, `/videos/3` reproduziria
 *  para o admin um vídeo que o dono nunca publicou.
 *
 *  Não é controle de acesso (o dado já chegou ao navegador), e sim recusa de
 *  exibir o que não deveria ter sido enviado. Quando a rota parar de entregar
 *  PRIVATE/DRAFT de terceiros também ao admin, isto vira redundante. */
export function canView(
  video: Pick<VideoResponse, 'status' | 'userId'>,
  viewerId: number | null | undefined,
): boolean {
  if (isPubliclyVisible(video)) return true
  // Só o dono vê o que não é público. `userId` ausente (backend antigo) não
  // permite provar posse — nega, que é o lado seguro do erro.
  return (
    typeof video.userId === 'number' &&
    typeof viewerId === 'number' &&
    video.userId === viewerId
  )
}

export const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Publicado',
  DRAFT: 'Rascunho',
  PRIVATE: 'Privado',
  PROCESSING: 'Processando',
  DELETED: 'Excluído',
}
