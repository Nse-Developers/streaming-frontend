import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoryApi } from '@/api/services'
import type { CategoryRequest } from '@/api/types'
import { useAuth } from '@/context/AuthContext'

/** GET /creators (o path real das categorias, ver services.ts). */
export function useCategories() {
  const { isAuthenticated, isReady } = useAuth()
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list(),
    enabled: isReady && isAuthenticated,
    staleTime: 5 * 60_000, // muda pouco
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CategoryRequest) => categoryApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: CategoryRequest }) =>
      categoryApi.update(name, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => categoryApi.remove(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}
