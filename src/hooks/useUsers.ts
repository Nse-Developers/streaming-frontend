import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/services'
import type { UserUpdateRequest } from '@/api/types'
import { useAuth } from '@/context/AuthContext'

/** GET /auth/users — só ADMIN. O hook só dispara para admin, evitando um 403
 *  garantido (que a camada HTTP interpretaria como sessão suspeita). */
export function useUsers() {
  const { isAdmin, isReady } = useAuth()
  return useQuery({
    queryKey: ['users'],
    queryFn: () => authApi.listUsers(),
    enabled: isReady && isAdmin,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, body }: { email: string; body: UserUpdateRequest }) =>
      authApi.updateUser(email, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => authApi.deleteUser(email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
