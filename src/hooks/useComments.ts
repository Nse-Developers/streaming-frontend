import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commentApi, commentLikeApi } from '@/api/services'
import { useAuth } from '@/context/AuthContext'

export function useComments(videoId: number) {
  const { isAuthenticated, isReady } = useAuth()
  return useQuery({
    queryKey: ['comments', videoId],
    queryFn: () => commentApi.list(videoId),
    enabled: isReady && isAuthenticated && Number.isInteger(videoId) && videoId > 0,
  })
}

export function useAddComment(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => commentApi.create(videoId, text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', videoId] }),
  })
}

/** Curtir/descurtir comentário. O backend não expõe "eu curti isto?", então o
 *  estado de curtida é local à sessão; o contador vem sempre do servidor. */
export function useToggleCommentLike(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: number; liked: boolean }) => {
      if (liked) await commentLikeApi.unlike(commentId)
      else await commentLikeApi.like(commentId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', videoId] }),
  })
}
