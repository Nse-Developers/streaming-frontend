import { Link, useParams } from 'react-router-dom'
import { Share2, Compass, ServerCrash } from 'lucide-react'
import { useVideo, useVideos } from '@/hooks/useVideos'
import { useToast } from '@/context/ToastContext'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { VideoCard } from '@/components/video/VideoCard'
import { CommentSection } from '@/components/video/CommentSection'
import { Avatar } from '@/components/ui/Avatar'
import { UserLink, UserAvatarLink } from '@/components/user/UserLink'
import { FollowButton } from '@/components/user/FollowButton'
import { FollowerCount } from '@/components/user/FollowerCount'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { toErrorMessage } from '@/api/client'
import { safeExternalUrl } from '@/lib/validation'
import { formatViews, formatRelativeDate } from '@/lib/format'
import { STATUS_LABEL } from '@/lib/video'

export function VideoPage() {
  const { id } = useParams<{ id: string }>()
  const videoId = Number(id)
  const isValidId = Number.isInteger(videoId) && videoId > 0

  const { data: video, isLoading, isError, error } = useVideo(videoId)
  const { data: allVideos } = useVideos()
  const { showToast } = useToast()

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: video?.tittle ?? 'Vídeo', url })
        return
      }
      await navigator.clipboard.writeText(url)
      showToast('Link copiado.', 'success')
    } catch {
      // Cancelar o compartilhamento nativo cai aqui; não é erro a reportar.
    }
  }

  if (!isValidId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Compass}
          title="Endereço inválido"
          description="O identificador do vídeo não é um número válido."
          action={
            <Link to="/">
              <Button variant="secondary">Voltar ao início</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="mt-4 h-7 w-3/4" />
            <Skeleton className="mt-3 h-20 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="aspect-video w-36 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError || !video) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={ServerCrash}
          title="Vídeo não encontrado"
          description={
            isError ? toErrorMessage(error) : 'Este vídeo não existe ou não está mais disponível.'
          }
          action={
            <Link to="/">
              <Button variant="secondary">Voltar ao início</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const poster = safeExternalUrl(video.thumbnailUrl)
  // O id do vídeo aberto é o :id da própria URL. Aqui só excluímos ele da
  // lista de relacionados, comparando pelo id normalizado (ver lib/video.ts).
  const related = (allVideos ?? []).filter((item) => item.id !== videoId).slice(0, 6)

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <VideoPlayer src={safeExternalUrl(video.videoUrl)} poster={poster} title={video.tittle} />

          <h1 className="mt-4 font-display text-lg font-extrabold leading-snug tracking-tight text-surface-900 sm:text-2xl">
            {video.tittle}
          </h1>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-surface-600 sm:text-sm">
            <span className="tabular-nums">{formatViews(video.views)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeDate(video.uploadDate)}</span>
            {video.status !== 'PUBLISHED' && (
              <Badge tone="neutral">{STATUS_LABEL[video.status] ?? video.status}</Badge>
            )}
          </div>

          {/* Ações: criador à esquerda, compartilhar à direita.
              Curtir/não curtir sai daqui enquanto a avaliação está em standby
              (feature a implementar; ver PENDENCIAS.md). */}
          <div className="mt-4 flex flex-col gap-3 border-y border-surface-200 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatarLink userId={video.userId} name={video.creatorName}>
                <Avatar name={video.creatorName} className="h-10 w-10 text-sm" />
              </UserAvatarLink>
              <div className="min-w-0">
                <UserLink
                  userId={video.userId}
                  name={video.creatorName}
                  className="block truncate font-display text-sm font-semibold text-surface-900"
                />
                <p className="text-xs text-surface-600">
                  Criador
                  {video.userId != null && <FollowerCount userId={video.userId} inline />}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {video.userId != null && (
                <FollowButton
                  userId={video.userId}
                  name={video.creatorName}
                  size="sm"
                  className="rounded-full"
                />
              )}
              <Button variant="secondary" size="sm" onClick={share} className="rounded-full">
                <Share2 size={15} />
                <span className="hidden sm:inline">Compartilhar</span>
              </Button>
            </div>
          </div>

          {video.description && (
            <div className="mt-4 rounded-xl bg-surface-100 p-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-surface-800">
                {video.description}
              </p>
            </div>
          )}

          <CommentSection videoId={videoId} />
        </div>

        {/* Relacionados */}
        <aside className="min-w-0">
          <h2 className="mb-4 font-display text-base font-bold text-surface-900">
            Outros vídeos
          </h2>
          {related.length === 0 ? (
            <p className="text-sm text-surface-600">Nenhum outro vídeo por aqui ainda.</p>
          ) : (
            <div className="space-y-4">
              {related.map((item) => (
                <VideoCard key={item.key} video={item} compact />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
