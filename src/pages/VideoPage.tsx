import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, Share2, Bookmark, Compass } from 'lucide-react'
import { useVideo, useVideos } from '@/hooks/useVideos'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { VideoCard } from '@/components/video/VideoCard'
import { CommentSection } from '@/components/video/CommentSection'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { mockApi } from '@/mocks/api'
import { creatorById } from '@/mocks/data'
import { formatCompact, formatViews, formatRelativeDate } from '@/lib/format'
import { cn } from '@/lib/cn'

export function VideoPage() {
  const { id } = useParams<{ id: string }>()
  const videoId = Number(id)
  const { data: video, isLoading, isError } = useVideo(videoId)
  const { data: allVideos } = useVideos()
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()

  const [liked, setLiked] = useState(() => mockApi.isVideoLiked(videoId))
  const [following, setFollowing] = useState(false)
  const [saved, setSaved] = useState(false)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="mt-4 h-7 w-3/4" />
            <Skeleton className="mt-3 h-16 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError || !video) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState icon={Compass} title="Vídeo não encontrado" description="Ele pode ter sido removido ou está indisponível." />
      </div>
    )
  }

  const creator = creatorById(video.creatorId)
  const related = (allVideos ?? []).filter((v) => v.id !== video.id).slice(0, 6)

  const requireAuth = (action: () => void) => {
    if (!isAuthenticated) {
      showToast('Entre na sua conta para fazer isso.', 'info')
      return
    }
    action()
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-5 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <VideoPlayer poster={video.thumbnail} />

          <h1 className="mt-4 font-display text-xl font-bold leading-snug text-surface-900 sm:text-2xl">
            {video.titulo}
          </h1>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={creator.name} className="h-10 w-10 text-sm" />
              <div>
                <p className="font-display text-sm font-semibold text-surface-900">{creator.name}</p>
                <p className="text-xs text-surface-600">{formatCompact(creator.followers)} seguidores</p>
              </div>
              <Button
                variant={following ? 'secondary' : 'primary'}
                size="sm"
                className="ml-2"
                onClick={() =>
                  requireAuth(() => {
                    setFollowing((v) => !v)
                    showToast(following ? 'Deixou de seguir.' : `Seguindo ${creator.name}.`, 'success')
                  })
                }
              >
                {following ? 'Seguindo' : 'Seguir'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-full bg-surface-200">
                <button
                  type="button"
                  onClick={() => requireAuth(() => setLiked((v) => !v))}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-300',
                    liked ? 'text-brand-400' : 'text-surface-800',
                  )}
                >
                  <ThumbsUp size={16} fill={liked ? 'currentColor' : 'none'} />
                  {formatCompact(1240 + (liked ? 1 : 0))}
                </button>
                <span className="my-2 w-px bg-surface-400/50" />
                <button
                  type="button"
                  onClick={() => requireAuth(() => showToast('Feedback registrado.', 'success'))}
                  className="px-4 py-2 text-surface-800 transition-colors hover:bg-surface-300"
                  aria-label="Não gostei"
                >
                  <ThumbsDown size={16} />
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => showToast('Link copiado para a área de transferência.', 'success')}
              >
                <Share2 size={16} />
                Compartilhar
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => requireAuth(() => { setSaved((v) => !v); showToast(saved ? 'Removido dos salvos.' : 'Salvo.', 'success') })}
              >
                <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-surface-100 p-4">
            <p className="text-sm font-semibold text-surface-900">
              {formatViews(video.views)} · {formatRelativeDate(video.publishedAt)} · {video.category}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-surface-800">{video.sinopse}</p>
          </div>

          <CommentSection videoId={video.id} />
        </div>

        <aside className="min-w-0">
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-surface-600">
            A seguir
          </h2>
          <div className="space-y-3">
            {related.map((item) => (
              <VideoCard key={item.id} video={item} compact />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
