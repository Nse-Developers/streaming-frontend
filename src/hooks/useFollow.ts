import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { followApi } from '@/api/services'
import { useAuth } from '@/context/AuthContext'

/** Número de seguidores de um usuário (GET /follow/users/{id}). */
export function useFollowers(userId: number | null | undefined) {
  const { isAuthenticated, isReady } = useAuth()
  const id = typeof userId === 'number' ? userId : 0
  return useQuery({
    queryKey: ['followers', id],
    queryFn: () => followApi.followers(id),
    enabled: isReady && isAuthenticated && Number.isInteger(id) && id > 0,
  })
}

/** Ids de quem o usuário LOGADO segue.
 *
 *  Uma só requisição serve a todos os botões da sessão: o resultado fica no
 *  cache do React Query sob uma chave única, então abrir dez perfis não gera
 *  dez chamadas. Antes desta rota existir, o estado do botão vinha de um
 *  espelho em localStorage — que errava sempre que a pessoa seguia por outro
 *  dispositivo, e não tinha como se corrigir.
 *
 *  `staleTime` alto porque a lista só muda por ação do próprio usuário, e toda
 *  ação já invalida a query explicitamente (ver useToggleFollow). */
export function useFollowing() {
  const { user, isAuthenticated, isReady } = useAuth()
  const me = user?.id
  return useQuery({
    queryKey: ['following', me],
    queryFn: () => followApi.following(me!),
    enabled: isReady && isAuthenticated && typeof me === 'number' && me > 0,
    staleTime: 5 * 60 * 1000,
  })
}

/** Seguir / deixar de seguir.
 *
 *  Invalida as duas queries afetadas: a lista de quem eu sigo (muda o estado do
 *  botão em qualquer tela) e o contador do alvo. Ambas voltam do servidor —
 *  o número de seguidores muda por ação de outras pessoas também, então não dá
 *  para simplesmente somar 1 localmente e confiar nisso. */
export function useToggleFollow(userId: number) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ following }: { following: boolean }) =>
      following ? followApi.unfollow(userId) : followApi.follow(userId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['following', user?.id] })
      void queryClient.invalidateQueries({ queryKey: ['followers', userId] })
    },
  })
}
