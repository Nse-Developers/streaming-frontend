import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Film, SearchX, ServerCrash, RotateCw, UploadCloud, Pin, PinOff } from 'lucide-react'
import { useVideos } from '@/hooks/useVideos'
import { useFeaturedVideo } from '@/hooks/useFeaturedVideo'
import { VideoCard } from '@/components/video/VideoCard'
import { VideoCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { HeroVideo } from '@/components/video/HeroVideo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { toErrorMessage } from '@/api/client'

/** Grid único usado pelo feed e pela busca — mantém o mesmo ritmo nas duas. */
const GRID = 'grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

export function HomePage() {
  const { data: videos, isLoading, isError, error, refetch, isFetching } = useVideos()
  const { isCreator, isAdmin } = useAuth()
  const { showToast } = useToast()
  const [params] = useSearchParams()
  const rawSearch = params.get('q')?.trim() ?? ''
  const search = rawSearch.toLowerCase()

  // Busca no cliente: a API não tem endpoint de busca, e a lista já vem inteira.
  const published = useMemo(
    () => (videos ?? []).filter((video) => video.status === 'PUBLISHED'),
    [videos],
  )

  const filtered = useMemo(() => {
    if (!search) return published
    return published.filter((video) =>
      `${video.tittle} ${video.description} ${video.creatorName}`.toLowerCase().includes(search),
    )
  }, [published, search])

  const { featured, rest, isPinned, pick } = useFeaturedVideo(published)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-5 sm:px-6">
        <div className="skeleton mb-9 aspect-[16/9] w-full rounded-xl sm:aspect-[21/9] lg:aspect-[2.6/1]" />
        <div className={GRID}>
          {Array.from({ length: 8 }).map((_, index) => (
            <VideoCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
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
              icon={SearchX}
              title={`Nada encontrado para "${rawSearch}"`}
              description="Tente outro termo ou confira a escrita."
            />
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-surface-600">
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
                    className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-200 hover:text-surface-900 focus-ring"
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
              <span className="text-xs text-surface-500">Vale só neste navegador.</span>
            </div>
          )}
        </section>
      )}

      {rest.length > 0 && (
        <>
          <h2 className="mb-4 font-display text-base font-bold text-surface-900">
            Vídeos recentes
          </h2>
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
                      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-200 hover:text-surface-900 focus-ring"
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
