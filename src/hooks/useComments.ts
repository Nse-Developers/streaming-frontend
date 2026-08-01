import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mockApi } from '@/mocks/api'

export function useComments(videoId: number) {
  return useQuery({
    queryKey: ['comments', videoId],
    queryFn: () => mockApi.listComments(videoId),
    enabled: Number.isFinite(videoId),
  })
}

export function useAddComment(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ text, authorId }: { text: string; authorId: number }) =>
      mockApi.addComment(videoId, text, authorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', videoId] }),
  })
}

export function useDeleteComment(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => mockApi.deleteComment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', videoId] }),
  })
}

export function useToggleCommentLike(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => mockApi.toggleCommentLike(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', videoId] }),
  })
}
