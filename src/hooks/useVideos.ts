import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mockApi } from '@/mocks/api'
import type { MockVideo } from '@/mocks/data'

export function useVideos() {
  return useQuery({ queryKey: ['videos'], queryFn: () => mockApi.listVideos() })
}

export function useAllVideos() {
  return useQuery({ queryKey: ['videos', 'all'], queryFn: () => mockApi.listAllVideos() })
}

export function useVideo(id: number) {
  return useQuery({ queryKey: ['videos', id], queryFn: () => mockApi.getVideo(id), enabled: Number.isFinite(id) })
}

export function useSetVideoStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: MockVideo['status'] }) => mockApi.setVideoStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
  })
}

export function useDeleteVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => mockApi.deleteVideo(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
  })
}

export function useUploadVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { titulo: string; sinopse: string; category: string; thumbnail?: string }) =>
      mockApi.uploadVideo(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
  })
}
