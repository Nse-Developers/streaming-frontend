import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { videoApi } from '@/api/services'
import type { VideoStatus, VideoUploadMetadata } from '@/api/types'
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
  const { user, isReady } = useAuth()
  const email = user?.email
  return useQuery({
    queryKey: ['videos', 'mine', email, status],
    queryFn: async () => toUiVideos(await videoApi.listByUserAndStatus(email!, status)),
    enabled: isReady && Boolean(email),
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

export function useUploadVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      metadata: VideoUploadMetadata
      file: File
      thumbnail: File
      onProgress?: (percent: number) => void
    }) => videoApi.upload(input.metadata, input.file, input.thumbnail, input.onProgress),
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
