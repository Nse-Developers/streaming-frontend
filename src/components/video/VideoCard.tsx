import { Link } from 'react-router-dom'
import { ImageOff, Lock, FileEdit, Loader } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { UiVideo } from '@/lib/video'
import { formatViews, formatRelativeDate } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Selo de status para vídeos que não estão publicados (usado em "Meus vídeos"). */
function StatusChip({ status }: { status: UiVideo['status'] }) {
  if (status === 'PUBLISHED') return null

  const map = {
    DRAFT: { icon: FileEdit, label: 'Rascunho' },
    PRIVATE: { icon: Lock, label: 'Privado' },
    PROCESSING: { icon: Loader, label: 'Processando' },
    DELETED: { icon: ImageOff, label: 'Excluído' },
  } as const
  const item = map[status as keyof typeof map]
  if (!item) return null

  const { icon: Icon, label } = item
  return (
    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
      <Icon size={10} />
      {label}
    </span>
  )
}

function Thumb({ video, className }: { video: UiVideo; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-surface-200', className)}>
      {video.safeThumbnail ? (
        <img
          src={video.safeThumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          // Thumbnail vem do MinIO; se o objeto sumir, cai no placeholder.
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-surface-500">
          <ImageOff size={20} />
        </div>
      )}
      <StatusChip status={video.status} />
    </div>
  )
}

interface VideoCardProps {
  video: UiVideo
  compact?: boolean
  /** Ações extra abaixo do card (destacar, publicar, excluir…). */
  actions?: React.ReactNode
}

/** Envolve o conteúdo num <Link> só quando há id real — sem ele não existe
 *  destino possível para /videos/:id (ver PENDENCIAS.md sobre versões do
 *  backend que ainda não devolvem o campo). */
function CardShell({
  video,
  className,
  children,
}: {
  video: UiVideo
  className: string
  children: React.ReactNode
}) {
  if (video.id != null) {
    return (
      <Link to={`/videos/${video.id}`} className={cn(className, 'focus-ring')}>
        {children}
      </Link>
    )
  }
  return <article className={className}>{children}</article>
}

/** Metadados numa linha só: canal · views · quando. Mais denso que empilhar
 *  três parágrafos, e é como o olho já está treinado a ler num feed de vídeo. */
function Meta({ video }: { video: UiVideo }) {
  return (
    <p className="mt-0.5 text-[13px] leading-snug text-surface-600">
      <span className="block truncate">{video.creatorName}</span>
      <span className="tabular-nums">
        {formatViews(video.views)} · {formatRelativeDate(video.uploadDate)}
      </span>
    </p>
  )
}

export function VideoCard({ video, compact, actions }: VideoCardProps) {
  if (compact) {
    return (
      <CardShell video={video} className="group flex gap-2.5 rounded-lg">
        <Thumb video={video} className="aspect-video w-[168px] shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-surface-900">
            {video.tittle}
          </h3>
          <Meta video={video} />
        </div>
      </CardShell>
    )
  }

  return (
    <div className="group flex flex-col">
      <CardShell video={video} className="flex flex-col rounded-xl">
        <Thumb video={video} className="aspect-video rounded-xl" />
        <div className="mt-2.5 flex gap-2.5">
          <Avatar name={video.creatorName} className="h-8 w-8 text-xs" />
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 font-display text-[14.5px] font-semibold leading-[1.3] text-surface-900">
              {video.tittle}
            </h3>
            <Meta video={video} />
          </div>
        </div>
      </CardShell>
      {actions && <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[42px]">{actions}</div>}
    </div>
  )
}
