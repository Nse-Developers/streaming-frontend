import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { videoApi } from '@/api/services'
import type { VideoConfirmStatus, VideoStatus, VideoUploadMetadata } from '@/api/types'
import { publicVideos, toUiVideos } from '@/lib/video'
import { useAuth } from '@/context/AuthContext'

/** Feed principal. `GET /video` é PÚBLICO desde 2026-09-02 — o backend deixou
 *  de exigir autenticação nessa rota, e é o que permite a home abrir para
 *  visitante. Sem `enabled` de sessão: a query roda para todo mundo.
 *
 *  Continua dependendo de `isReady` para não disparar duas vezes no boot. A
 *  primeira chamada saía anônima e, assim que /auth/me respondesse, o
 *  `queryClient.clear()` do login a descartaria — buscar a lista inteira duas
 *  vezes por carregamento. Esperar a sessão ser resolvida custa alguns
 *  milissegundos e faz uma requisição só, já com o cookie certo (o backend
 *  entrega mais coisa a quem está logado: rascunho e privado do próprio dono).
 */
export function useVideos() {
  const { isReady } = useAuth()
  return useQuery({
    queryKey: ['videos'],
    queryFn: async () => toUiVideos(await videoApi.listAll()),
    enabled: isReady,
  })
}

/** Vitrine da landing: os vídeos publicados mais recentes, ou `null`.
 *
 *  `null` é o contrato com a página — e não uma lista vazia — porque a landing
 *  TEM um conteúdo de apresentação estático para cair de volta. Enquanto a
 *  rota não responde, a página mostra esse conteúdo em vez de um buraco, um
 *  spinner eterno ou um erro: ela é a porta de entrada do produto para quem
 *  ainda não tem conta, e falhar visivelmente ali é o pior lugar possível.
 *
 *  Hoje `GET /video` responde 403 sem sessão na API hospedada, apesar de
 *  useVideos() acima documentar a rota como pública desde 2026-09-02. Este
 *  hook não tenta contornar isso: com 403 ele devolve `null` e a landing segue
 *  estática. No dia em que o backend liberar a rota, a vitrine passa a mostrar
 *  o acervo real sozinha, sem tocar no front.
 *
 *  `retry: false` porque 403 não melhora com insistência, e o custo de errar
 *  aqui é atrasar a primeira tela que o visitante vê. */
export function useShowcaseVideos(limit = 4) {
  const { isReady } = useAuth()
  const query = useQuery({
    queryKey: ['videos', 'showcase'],
    queryFn: async () => toUiVideos(await videoApi.listAll()),
    enabled: isReady,
    retry: false,
    // A landing é cacheável de forma agressiva: o acervo não muda no intervalo
    // de uma visita, e revalidar a cada foco custaria uma requisição por
    // alt-tab numa página que a pessoa mantém aberta enquanto decide.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  if (!query.data) return null

  const items = publicVideos(query.data)
    // Mais recente primeiro. A vitrine se chama "veja como é o feed de
    // verdade": mostrar o acervo antigo contradiz a promessa.
    .slice()
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .filter((video) => video.id != null && video.safeThumbnail)
    .slice(0, limit)

  // Menos que `limit` fica pior que o estático: a grade de 4 colunas abriria
  // com um ou dois cards e um vazio do lado.
  return items.length === limit ? items : null
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
  /** Status final aplicado no confirm. */
  status: VideoConfirmStatus
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
 *  O passo 3 roda SEMPRE, inclusive para rascunho. Antes ele era pulado nesse
 *  caso (o confirm não aceitava DRAFT), e junto com ele iam embora as duas
 *  únicas verificações do fluxo: que o arquivo chegou ao storage e que o
 *  tamanho real cabe no limite. Um rascunho cujo PUT falhou em silêncio ficava
 *  salvo como se estivesse íntegro, e o usuário só descobriria ao publicar.
 *
 *  Os três status da tela (publicado, rascunho, privado) saem num confirm só —
 *  verificado contra a API rodando. Houve aqui um contorno de duas chamadas
 *  para PRIVATE, escrito quando a nota de release parecia excluí-lo; o teste
 *  mostrou que ele passa direto, e a chamada extra saiu. */
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

      onPhase?.('confirming')
      await videoApi.confirmUpload(videoId, status)

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
