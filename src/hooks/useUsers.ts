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

/** PUT /auth/users/verify-account/{email} — liga/desliga o selo de verificado.
 *
 *  Invalida `['users']` em vez de escrever a resposta no cache: a lista é a
 *  fonte da seção de verificação do admin E do `useVerifiedById` abaixo, e um
 *  refetch garante que as duas leiam o mesmo estado que o servidor confirmou.
 *  A resposta traz o UserResponse atualizado, mas confiar nela deixaria o
 *  resto da lista com o dado antigo se outro admin tivesse mexido em paralelo.
 *
 *  Não invalida `['users','public',id]`: o DTO público não tem o campo, então
 *  nada mudaria ali. */
export function useSetUserVerified() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, isVerified }: { email: string; isVerified: boolean }) =>
      authApi.setUserVerified(email, isVerified),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

/** Descobre se um usuário QUALQUER tem o selo, pelo id.
 *
 *  Devolve `undefined` para "não sei", que é diferente de `false`. O
 *  VerifiedBadge só desenha no `true`, então um dado desconhecido nunca aparece
 *  como "não verificado".
 *
 *  Hoje a API já entrega `userIsVerified` em `/auth/me`, `/auth/users`,
 *  `/auth/user/{id}`, `/video` e `/comments/{id}` — em 2026-09-10. O hook
 *  continua útil como fallback para qualquer backend antigo ou para uma tela
 *  que ainda não passou a ler o campo direto da resposta, mas a regra correta
 *  é usar o valor vindo da API em cada item renderizado.
 *
 *  A lista entra com `enabled: false`: o hook ASSINA o cache (e re-renderiza
 *  quando ele muda, como depois de `useSetUserVerified`) mas nunca dispara a
 *  request. Isso evita um fetch de toda a base só para desenhar selos. */
export function useVerifiedById(userId: number | null | undefined): boolean | undefined {
  const { user } = useAuth()
  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => authApi.listUsers(),
    enabled: false,
  })

  if (userId == null) return undefined
  if (user?.id === userId) return user.isVerified
  return allUsers?.find((item) => item.id === userId)?.userIsVerified
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => authApi.deleteUser(email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
