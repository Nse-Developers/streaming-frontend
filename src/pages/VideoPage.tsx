import { Link, useParams } from 'react-router-dom'
import { Share2, Compass, ServerCrash } from 'lucide-react'
import { useVideo, useVideos } from '@/hooks/useVideos'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { VideoCard } from '@/components/video/VideoCard'
import { CommentSection } from '@/components/video/CommentSection'
import { RatingSection } from '@/components/video/RatingSection'
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
import { formatRelativeDate } from '@/lib/format'
import { STATUS_LABEL, canView } from '@/lib/video'

export function VideoPage() {
  const { id } = useParams<{ id: string }>()
  const videoId = Number(id)
  const isValidId = Number.isInteger(videoId) && videoId > 0

  const { data: video, isLoading, isError, error, refetch } = useVideo(videoId)
  const { data: allVideos } = useVideos()
  const { showToast } = useToast()
  const { user } = useAuth()

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
          headingLevel="h1"
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
        <div className="grid gap-8 min-[880px]:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="mt-4 h-7 w-3/4" />
            <Skeleton className="mt-3 h-20 w-full rounded-xl" />
          </div>
          {/* Mesmas proporções do card compacto real (capa com basis de 168px
              limitada a 45%), para a lista não "pular" quando os dados chegam. */}
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-start gap-2.5">
                <Skeleton className="aspect-video w-full min-w-0 shrink-0 basis-[168px] max-w-[45%] rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
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

  // O backend entrega PRIVATE/DRAFT de terceiros nesta rota (ver `canView`).
  // Tratado como "não encontrado", e não como um 403 explícito: dizer "sem
  // permissão" confirmaria a existência do vídeo naquele id para quem está
  // sondando. A mesma tela do id inexistente não revela nada.
  const blocked = Boolean(video) && !canView(video!, user?.id)

  if (isError || !video || blocked) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <EmptyState
          headingLevel="h1"
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
      <div className="grid gap-8 min-[880px]:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <VideoPlayer
            src={safeExternalUrl(video.videoUrl)}
            poster={poster}
            title={video.tittle}
            // Refetch da query do vídeo: traz uma URL assinada nova quando a
            // anterior expira (6 h). `refetch` já ignora o staleTime.
            onRetry={() => void refetch()}
          />

          <h1 className="mt-4 font-display text-lg font-extrabold leading-snug tracking-tight text-surface-900 sm:text-2xl">
            {video.tittle}
          </h1>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-surface-600 sm:text-sm">
            {/* TEMP: contagem de visualizacoes escondida a pedido do time.
                Para voltar, reponha:
                <span className="tabular-nums">{formatViews(video.views)}</span>
                <span aria-hidden="true">·</span> */}
            <span>{formatRelativeDate(video.uploadDate)}</span>
            {video.status !== 'PUBLISHED' && (
              <Badge tone="neutral">{STATUS_LABEL[video.status] ?? video.status}</Badge>
            )}
          </div>

          {/* Ações: criador à esquerda, compartilhar à direita.
              Curtir/não curtir NÃO fica aqui: a reação é parte da avaliação
              (POST /feedback), junto da nota — ver RatingSection abaixo. */}
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

          <RatingSection videoId={videoId} />

          <CommentSection videoId={videoId} />
        </div>

        {/* Relacionados */}
        <aside className="@container min-w-0">
          <h2 className="mb-4 font-display text-base font-bold text-surface-900">
            Outros vídeos
          </h2>
          {related.length === 0 ? (
            <p className="text-sm text-surface-600">Nenhum outro vídeo por aqui ainda.</p>
          ) : (
            // Container query, e não breakpoint de viewport: o que decide se
            // cabem duas colunas é a largura DESTE bloco, não a da janela.
            //
            // Com `sm:grid-cols-2 min-[880px]:grid-cols-1` a conta era feita
            // pela janela enquanto o espaço real vinha do grid da página (menos
            // a sidebar de 72px, o padding e a coluna do player). As duas
            // medidas discordavam justamente na faixa em que a lista já era
            // coluna lateral: ela recebia ~340px, dividia em duas colunas de
            // ~170px e o thumb de 168px consumia a linha inteira — sobrava
            // nada para o texto, que quebrava uma palavra por linha.
            //
            // Duas colunas só a partir de 520px DE CONTAINER: 2 × (168 de capa
            // + 10 de gap + 80 de texto) + 16 do gap entre colunas. Abaixo
            // disso, uma por linha em qualquer viewport.
            <div className="grid gap-4 @[520px]:grid-cols-2">
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
