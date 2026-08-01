import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Play, Film, SearchX } from 'lucide-react'
import { useVideos } from '@/hooks/useVideos'
import { useCategories } from '@/hooks/useCategories'
import { VideoCard } from '@/components/video/VideoCard'
import { VideoCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { creatorById, type MockVideo } from '@/mocks/data'
import { formatViews, formatRelativeDate } from '@/lib/format'
import { cn } from '@/lib/cn'

export function HomePage() {
  const { data: videos, isLoading } = useVideos()
  const { data: categories } = useCategories()
  const [params] = useSearchParams()
  const search = params.get('q')?.trim().toLowerCase() ?? ''
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return (videos ?? []).filter((video) => {
      const matchesSearch = search
        ? `${video.titulo} ${video.sinopse} ${creatorById(video.creatorId).name}`.toLowerCase().includes(search)
        : true
      const matchesCategory = activeCategory ? video.category === activeCategory : true
      return matchesSearch && matchesCategory
    })
  }, [videos, search, activeCategory])

  const isBrowsing = Boolean(search || activeCategory)
  const [featured, ...rest] = filtered

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-5 sm:px-6">
      {categories && (
        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <CategoryChip label="Tudo" active={!activeCategory} onClick={() => setActiveCategory(null)} />
          {categories.map((category) => (
            <CategoryChip
              key={category.name}
              label={category.name}
              active={activeCategory === category.name}
              onClick={() => setActiveCategory(activeCategory === category.name ? null : category.name)}
            />
          ))}
        </div>
      )}

      {isLoading && (
        <>
          <div className="mb-10 aspect-[21/9] w-full animate-pulse rounded-2xl bg-surface-200 lg:aspect-[3/1]" />
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={search ? SearchX : Film}
          title={search ? `Nada encontrado para "${params.get('q')}"` : 'Nenhum vídeo nesta categoria'}
          description={
            search
              ? 'Tente outro termo ou remova o filtro de categoria.'
              : 'Escolha outra categoria para continuar explorando.'
          }
        />
      )}

      {!isLoading && featured && !isBrowsing && <FeaturedHero video={featured} />}

      {!isLoading && filtered.length > 0 && (
        <>
          {!isBrowsing && <h2 className="mb-4 font-display text-lg font-bold text-surface-900">Em alta agora</h2>}
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(isBrowsing ? filtered : rest).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150 focus-ring',
        active
          ? 'bg-surface-900 text-surface-0'
          : 'bg-surface-200 text-surface-800 hover:bg-surface-300',
      )}
    >
      {label}
    </button>
  )
}

function FeaturedHero({ video }: { video: MockVideo }) {
  const creator = creatorById(video.creatorId)
  return (
    <Link
      to={`/videos/${video.id}`}
      className="group relative mb-10 block overflow-hidden rounded-2xl focus-ring"
    >
      <div className="aspect-[16/9] w-full sm:aspect-[21/9] lg:aspect-[3/1]">
        <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
          Destaque
        </span>
        <h1 className="max-w-2xl font-display text-2xl font-extrabold leading-tight text-white sm:text-4xl">
          {video.titulo}
        </h1>
        <p className="mt-2 hidden max-w-xl text-sm text-white/80 sm:line-clamp-2">{video.sinopse}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-surface-900 transition-transform duration-150 group-hover:scale-[1.03]">
            <Play size={16} fill="currentColor" />
            Assistir
          </span>
          <span className="text-sm text-white/75">
            {creator.name} · {formatViews(video.views)} · {formatRelativeDate(video.publishedAt)}
          </span>
        </div>
      </div>
    </Link>
  )
}
