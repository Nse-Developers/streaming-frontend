import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { feedbackApi } from '@/api/services'
import type { FeedbackRequest } from '@/api/types'
import { useAuth } from '@/context/AuthContext'

/** Todas as avaliações da plataforma (GET /feedback/getFeedbacks).
 *
 *  O backend não oferece filtro por vídeo nem por usuário, então esta é a ÚNICA
 *  fonte de avaliação que existe — todo recorte acontece no cliente, sobre esta
 *  mesma query. Manter uma chave só (`['feedbacks']`) é o que garante que a
 *  resposta pesada seja buscada uma vez e reaproveitada por cada tela: a nota
 *  do vídeo aberto, o formulário e a listagem do admin compartilham o cache.
 *
 *  CUIDADO — ESTA RESPOSTA CRESCE SEM LIMITE. Medido em 2026-08-27: 26 KB para
 *  16 avaliações, ~1,6 KB por item, e 97% disso é o `videoResponse` aninhado
 *  (que carrega DUAS URLs assinadas, com centenas de bytes de query string
 *  cada) — de tudo isso a UI usa apenas `videId`, `rating`, a reação e o id do
 *  usuário. Na mesma proporção: 500 avaliações ≈ 800 KB, 5.000 ≈ 8 MB.
 *
 *  Como `RatingSection` fica na página de CADA vídeo, sem cache isso viraria um
 *  download de vários MB por vídeo aberto. Daí as duas defesas:
 *
 *   - `staleTime: Infinity` — busca UMA vez por sessão. A média de um vídeo não
 *     é dado que precise estar ao segundo, e toda escrita daqui (`useGiveFeedback`,
 *     `useRemoveFeedback`) invalida a chave explicitamente, então a nota do
 *     próprio usuário atualiza na hora mesmo assim.
 *   - `gcTime` longo — evita que sair e voltar à página de um vídeo (o padrão
 *     de 5 min do QueryClient descartaria o cache) rebaixe tudo isso de novo.
 *
 *  A correção de verdade é no backend: um `GET /feedback/video/{id}` com a
 *  média agregada, ou ao menos sem os objetos aninhados. Enquanto não existir,
 *  o cache é o que segura o custo. */
export function useFeedbacks() {
  const { isAuthenticated, isReady } = useAuth()
  return useQuery({
    queryKey: ['feedbacks'],
    queryFn: () => feedbackApi.listAll(),
    enabled: isReady && isAuthenticated,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  })
}

/** Nota média e total de avaliações de UM vídeo, derivados no cliente.
 *
 *  Deriva da mesma query de `useFeedbacks` em vez de pedir de novo: não existe
 *  rota por vídeo, e um segundo fetch traria exatamente os mesmos dados.
 *
 *  `average` é null (não 0) quando ninguém avaliou: 0 seria uma nota — e a UI
 *  precisa distinguir "sem avaliações" de "avaliado com a nota mínima". */
export function useVideoRating(videoId: number | null | undefined) {
  const { data, isLoading, isError } = useFeedbacks()

  const mine = (data ?? []).filter(
    (feedback) => feedback.videoResponse?.videId === videoId,
  )
  const total = mine.length
  const sum = mine.reduce((acc, feedback) => acc + (feedback.rating ?? 0), 0)

  return {
    average: total > 0 ? sum / total : null,
    total,
    likes: mine.filter((feedback) => feedback.feedbackReactionType === 'LIKE').length,
    dislikes: mine.filter((feedback) => feedback.feedbackReactionType === 'DISLIKE').length,
    isLoading,
    isError,
  }
}

/** A avaliação DO USUÁRIO LOGADO para um vídeo, ou null se ainda não avaliou.
 *
 *  É o que permite a tela escolher entre "avaliar" e "sua nota: 4 — remover":
 *  sem isso, o formulário apareceria sempre e a segunda tentativa levaria um
 *  409 do backend (cada usuário avalia um vídeo uma única vez).
 *
 *  O par (vídeo, usuário) é comparado por ID, nunca por e-mail ou nome — os
 *  objetos aninhados trazem os dois, mas só o id é estável. */
export function useMyVideoFeedback(videoId: number | null | undefined) {
  const { user } = useAuth()
  const { data, isLoading, isError } = useFeedbacks()

  const mine =
    (data ?? []).find(
      (feedback) =>
        feedback.videoResponse?.videId === videoId &&
        feedback.userResponse?.id === user?.id,
    ) ?? null

  return { feedback: mine, isLoading, isError }
}

/** Envia a avaliação (POST /feedback/{videoId}).
 *
 *  Invalida `['feedbacks']` porque a média do vídeo, o total e a "minha nota"
 *  todos derivam daquela query — sem isso a tela continuaria mostrando o estado
 *  anterior mesmo com o POST bem-sucedido. */
export function useGiveFeedback(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: FeedbackRequest) => feedbackApi.give(videoId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedbacks'] }),
  })
}

/** Remove a própria avaliação (DELETE /feedback/{videoId}).
 *
 *  O parâmetro é o id do VÍDEO, não o da avaliação — ver `feedbackApi.remove`.
 *  É também o caminho para TROCAR de nota: remover e avaliar de novo, já que o
 *  backend não expõe update. */
export function useRemoveFeedback(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => feedbackApi.remove(videoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feedbacks'] }),
  })
}
