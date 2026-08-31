import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { videoApi } from '@/api/services'
import type { VideoConfirmStatus, VideoStatus, VideoUploadMetadata } from '@/api/types'
import { toUiVideos } from '@/lib/video'
import { useAuth } from '@/context/AuthContext'

/** Feed principal. GET /video hoje exige token na prática (o service do backend
 *  chama getAuthenticate() mesmo na rota pública), então só busca com sessão. */
export function useVideos() {
  const { isAuthenticated, isReady } = useAuth()
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => toUiVideos(await videoApi.listAll()),
    enabled: isReady && isAuthenticated,
  })
}

/** Vídeos do usuário logado num status específico (aba "Meus vídeos"). */
export function useMyVideos(status: VideoStatus) {
  const { user, isAuthenticated, isReady } = useAuth()
  const email = user?.email
  return useQuery({
    queryKey: ['videos', 'mine', email, status],
    queryFn: async () => toUiVideos(await videoApi.listByUserAndStatus(email!, status)),
    // `isAuthenticated` junto de `email` (e não só `email`) para acompanhar os
    // outros hooks: esta query pede DRAFT e PRIVATE, e sem essa checagem ela
    // seguia buscando vídeos não publicados depois de um 401 já ter derrubado
    // a sessão — o caminho de erro de rede em refreshUser preserva `user`, e
    // com ele o `email` continuava truthy.
    enabled: isReady && isAuthenticated && Boolean(email),
  })
}

export function useVideo(id: number) {
  const { isAuthenticated, isReady } = useAuth()
  return useQuery({
    queryKey: ['videos', id],
    queryFn: () => videoApi.getById(id),
    enabled: isReady && isAuthenticated && Number.isInteger(id) && id > 0,
  })
}

/** Fase do upload, para a UI dizer o que está acontecendo.
 *
 *  São três chamadas de rede distintas e o usuário precisa saber em qual está:
 *  a do meio é a longa (o arquivo inteiro), e as outras duas são rápidas. Sem
 *  isso, a barra ficaria parada em 100% durante o confirm sem explicação. */
export type UploadPhase = 'idle' | 'preparing' | 'uploading' | 'confirming' | 'done'

export interface UploadVideoInput {
  metadata: VideoUploadMetadata
  file: File
  thumbnail: File
  /** Status final aplicado no confirm. DRAFT não entra: o vídeo já nasce nele
   *  no passo 1, e o backend recusaria a transição para o mesmo status. */
  status: VideoConfirmStatus | 'DRAFT'
  onPhase?: (phase: UploadPhase) => void
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/** Upload em três passos, encadeados numa mutation só.
 *
 *  1. POST /video/upload-url  — thumbnail + metadata, devolve URL assinada
 *  2. PUT  <uploadUrl>        — o arquivo, direto ao storage (fora da API)
 *  3. POST /video/{id}/confirm — a API confere no storage e aplica o status
 *
 *  Os três são um só do ponto de vista do usuário: se qualquer um falhar, o
 *  vídeo não aparece no catálogo. Parar no meio deixa um DRAFT órfão, que é
 *  justamente o desenho do backend — melhor um rascunho invisível do que um
 *  vídeo publicado sem arquivo.
 *
 *  Quando o usuário escolhe "rascunho", o passo 3 é PULADO de propósito: o
 *  vídeo já está em DRAFT desde o passo 1, e o backend responde 409 a uma
 *  transição para o status atual. O custo é que o tamanho real do arquivo não
 *  fica gravado (é o confirm que faz isso) — some quando ele publicar depois. */
export function useUploadVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UploadVideoInput) => {
      const { metadata, file, thumbnail, status, onPhase, onProgress, signal } = input

      onPhase?.('preparing')
      const { uploadUrl, videoId } = await videoApi.requestUploadUrl(metadata, thumbnail)

      onPhase?.('uploading')
      // O contentType do PUT vem do metadata, NÃO de `file.type` lido de novo:
      // ele faz parte da assinatura da URL e os dois passos precisam concordar
      // sobre a mesma string, ou o storage recusa com SignatureDoesNotMatch.
      await videoApi.putToStorage(uploadUrl, file, metadata.contentType, onProgress, signal)

      if (status !== 'DRAFT') {
        onPhase?.('confirming')
        await videoApi.confirmUpload(videoId, status)
      }

      onPhase?.('done')
      return videoId
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
  })
}

export function useUpdateVideoStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: VideoStatus }) =>
      videoApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
  })
}

export function useDeleteVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => videoApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
  })
}
