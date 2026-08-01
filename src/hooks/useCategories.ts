import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mockApi } from '@/mocks/api'

export function useCategories() {
  return useQuery({ queryKey: ['categories'], queryFn: () => mockApi.listCategories() })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => mockApi.createCategory(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => mockApi.deleteCategory(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  })
}
