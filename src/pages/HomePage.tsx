import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Film, SearchX, ServerCrash, RotateCw, UploadCloud, Pin, PinOff } from 'lucide-react'
import { useVideos } from '@/hooks/useVideos'
import { useFeaturedVideo } from '@/hooks/useFeaturedVideo'
import { VideoCard } from '@/components/video/VideoCard'
import { LoadingRegion, VideoCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { HeroVideo } from '@/components/video/HeroVideo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { toErrorMessage } from '@/api/client'
import { publicVideos } from '@/lib/video'

/** Grid único usado pelo feed e pela busca — mantém o mesmo ritmo nas duas.
 *
 *  A terceira coluna entra em 880px, não em `lg` (1024px). Enquanto o salto
 *  era sm -> lg, o card ENCOLHIA quando a tela crescia: 352px a 768px, 468px a
 *  1000px (duas colunas larguíssimas) e de repente 291px a 1024px, porque a
 *  terceira coluna e o rail de 72px entravam no mesmo ponto. Num app de vídeo
 *  a capa é o conteúdo — ela não pode diminuir num monitor maior.
 *
 *  A quinta coluna acima de 1700px existe porque o container trava em 1600px:
 *  sem ela, 4 colunas de 376px ficam desproporcionalmente grandes num monitor
 *  de 2560px. */
const GRID =
  'grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 min-[880px]:grid-cols-3 xl:grid-cols-4 min-[1700px]:grid-cols-5'

export function HomePage() {
  const { data: videos, isLoading, isError, error, refetch, isFetching } = useVideos()
  const { isCreator, isAdmin } = useAuth()
  const { showToast } = useToast()
  const [params] = useSearchParams()
  const rawSearch = params.get('q')?.trim() ?? ''
  const search = rawSearch.toLowerCase()

  // Busca no cliente: a API não tem endpoint de busca, e a lista já vem inteira.
  // O recorte de visibilidade vem de lib/video.ts (ponto único da regra).
  const published = useMemo(() => publicVideos(videos), [videos])

  const filtered = useMemo(() => {
    if (!search) return published
    return published.filter((video) =>
      `${video.tittle} ${video.description} ${video.creatorName}`.toLowerCase().includes(search),
    )
  }, [published, search])

  const { featured, rest, isPinned, pick } = useFeaturedVideo(published)

  if (isLoading) {
    return (
      <LoadingRegion label="Carregando vídeos…" className="mx-auto max-w-[1600px] px-4 pb-12 pt-5 sm:px-6">
        <div
          aria-hidden="true"
          className="skeleton mb-9 aspect-[16/9] w-full rounded-xl sm:aspect-[21/9] min-[880px]:aspect-[2.6/1] lg:aspect-[2.8/1]"
        />
        <div className={GRID}>
          {Array.from({ length: 8 }).map((_, index) => (
            <VideoCardSkeleton key={index} />
          ))}
        </div>
      </LoadingRegion>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          headingLevel="h1"
          icon={ServerCrash}
          title="Não foi possível carregar os vídeos"
          description={toErrorMessage(error)}
          action={
            <Button variant="secondary" onClick={() => refetch()} isLoading={isFetching}>
              <RotateCw size={16} />
              Tentar de novo
            </Button>
          }
        />
      </div>
    )
  }

  if (search) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-5 sm:px-6">
        {filtered.length === 0 ? (
          <div className="mx-auto max-w-2xl py-16">
            <EmptyState
              headingLevel="h1"
              icon={SearchX}
              title={`Nada encontrado para "${rawSearch}"`}
              description="Tente outro termo ou confira a escrita."
            />
          </div>
        ) : (
          <>
            <h1 className="sr-only">Resultados da busca</h1>
            {/* role=status: a contagem muda a cada tecla digitada na busca e o
                grid é substituído em silêncio. Assim o leitor de tela recebe
                "12 resultados para X" sem precisar sair e voltar. */}
            <p role="status" className="mb-5 text-sm text-surface-600">
              {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'} para{' '}
              <span className="font-medium text-surface-900">“{rawSearch}”</span>
            </p>
            <div className={GRID}>
              {filtered.map((video) => (
                <VideoCard key={video.key} video={video} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (published.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          headingLevel="h1"
          icon={Film}
          title="Ainda não há vídeos publicados"
          description={
            isCreator
              ? 'Seja o primeiro a publicar algo por aqui.'
              : 'Volte em breve — os criadores estão só começando.'
          }
          action={
            isCreator ? (
              <Link to="/upload">
                <Button>
                  <UploadCloud size={16} />
                  Enviar meu primeiro vídeo
                </Button>
              </Link>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-5 sm:px-6">
      {featured && (
        <section className="mb-9">
          <HeroVideo video={featured} />

          {/* Controle de destaque: só ADMIN vê. A escolha é local a este
              navegador (ver lib/featured.ts) — dito na própria UI para não
              parecer que vale para os visitantes. */}
          {isAdmin && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {isPinned ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-ink">
                    <Pin size={12} />
                    Destaque fixado por você
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      pick(null)
                      showToast('Destaque liberado — volta a mostrar o mais recente.', 'info')
                    }}
                    className="-m-1 inline-flex items-center gap-1.5 rounded-md p-2 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-200 hover:text-surface-900 focus-ring"
                  >
                    <PinOff size={12} />
                    Remover
                  </button>
                </>
              ) : (
                <span className="text-xs text-surface-600">
                  Mostrando o vídeo mais recente. Use “Destacar” num card abaixo para fixar outro.
                </span>
              )}
              <span className="text-xs text-surface-600">Vale só neste navegador.</span>
            </div>
          )}
        </section>
      )}

      {rest.length > 0 && (
        <>
          {/* h1 da home. Visualmente é o mesmo título de seção de antes, mas
              como h1: era a única página que começava em h2, e quem navega por
              headings chegava na tela principal sem ponto de entrada. */}
          <h1 className="mb-4 font-display text-base font-bold text-surface-900">
            Vídeos recentes
          </h1>
          <div className={GRID}>
            {rest.map((video) => (
              <VideoCard
                key={video.key}
                video={video}
                actions={
                  isAdmin && video.id != null ? (
                    <button
                      type="button"
                      onClick={() => {
                        pick(video.id!)
                        showToast(`“${video.tittle}” agora é o destaque.`, 'success')
                      }}
                      className="-m-1 inline-flex items-center gap-1.5 rounded-md p-2 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-200 hover:text-surface-900 focus-ring"
                    >
                      <Pin size={12} />
                      Destacar
                    </button>
                  ) : undefined
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
