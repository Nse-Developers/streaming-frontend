import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/services'
import { ApiError } from '@/api/client'
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

/** GET /auth/user/{id} — perfil público de outro usuário.
 *
 *  Só dispara com sessão ativa: a rota exige CREATORS ou VIEWERS, e um 403
 *  garantido seria lido pela camada HTTP como sessão suspeita.
 *
 *  Um 404 aqui é resposta definitiva ("não existe"), não falha temporária —
 *  então não faz sentido reexecutar. Sem isso o React Query tentaria 3 vezes e
 *  a tela ficaria em "carregando" por vários segundos antes de dizer o óbvio. */
export function usePublicUser(id: number) {
  const { isAuthenticated, isReady } = useAuth()
  return useQuery({
    queryKey: ['users', 'public', id],
    queryFn: () => authApi.getUserById(id),
    enabled: isReady && isAuthenticated && Number.isInteger(id) && id > 0,
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status === 404 ? false : failureCount < 2,
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
