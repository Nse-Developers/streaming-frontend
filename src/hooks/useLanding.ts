import { useQuery } from '@tanstack/react-query'
import { landingApi } from '@/api/services'

/** Dados da home pública: números e vitrine, de `GET /landing`.
 *
 *  Sem `enabled` de sessão — ao contrário de todo hook de dados deste app.
 *  Esta é a única rota que responde sem autenticação, e esperar o
 *  `AuthContext` resolver atrasaria a primeira tela que o visitante vê por uma
 *  informação que a requisição não usa. Ela também não manda cookie nem
 *  Authorization (ver `publicHttp`), então não há sessão a aguardar.
 *
 *  `retry: false`: com a rota fora do ar o fallback estático da landing já é a
 *  resposta certa, e insistir só adia a renderização da página de entrada.
 *
 *  `staleTime` de 10 min com refetch ao voltar o foco por causa do
 *  `thumbnailUrl`, que é assinado e expira em 24 h: numa aba deixada aberta as
 *  capas quebrariam, e a correção prevista pelo backend é refazer a chamada —
 *  nunca guardar a URL. */
export function useLanding() {
  return useQuery({
    queryKey: ['landing'],
    queryFn: () => landingApi.get(),
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/** Vitrine para a página, ou `null` quando não há o que mostrar.
 *
 *  `null` — e não lista vazia — é o contrato com a landing, que tem conteúdo
 *  de apresentação para exibir no lugar. Cai nele em três casos: a rota falhou,
 *  o acervo ainda não tem vídeo publicado (`videos` vem vazio de propósito), ou
 *  algum item chegou sem id/capa e não daria um card clicável.
 *
 *  Mostrar buraco, spinner eterno ou mensagem de erro na porta de entrada do
 *  produto é o pior lugar possível para falhar — daí o fallback em vez de
 *  propagar o estado de erro. */
export function useShowcase() {
  const { data } = useLanding()
  if (!data?.videos?.length) return null

  // A ordem vem pronta do backend (3 mais vistos, decrescente) e é respeitada:
  // reordenar aqui só criaria uma segunda regra para a mesma decisão.
  const usable = data.videos.filter((video) => video.videoId != null && video.thumbnailUrl)
  return usable.length > 0 ? usable : null
}
