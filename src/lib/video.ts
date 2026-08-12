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

/** Extrai o UUID do nome do arquivo em MinIO:
 *  ".../creators-<uuid>--thumbnails-.png" -> "<uuid>" */
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

export const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Publicado',
  DRAFT: 'Rascunho',
  PRIVATE: 'Privado',
  PROCESSING: 'Processando',
  DELETED: 'Excluído',
}
