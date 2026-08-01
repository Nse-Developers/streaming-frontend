import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { creatorById } from '@/mocks/data'
import type { MockVideo } from '@/mocks/data'
import { formatViews, formatRelativeDate } from '@/lib/format'

export function VideoCard({ video, compact }: { video: MockVideo; compact?: boolean }) {
  const creator = creatorById(video.creatorId)

  if (compact) {
    return (
      <Link to={`/videos/${video.id}`} className="group flex gap-3 rounded-lg focus-ring">
        <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-md bg-surface-200">
          <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[10px] font-semibold tabular-nums text-white">
            {video.duration}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-surface-900 group-hover:text-brand-400">
            {video.titulo}
          </h3>
          <p className="mt-1 truncate text-xs text-surface-600">{creator.name}</p>
          <p className="text-xs text-surface-600">
            {formatViews(video.views)} · {formatRelativeDate(video.publishedAt)}
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/videos/${video.id}`} className="group flex flex-col gap-3 rounded-lg focus-ring">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-200">
        <img
          src={video.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
          {video.duration}
        </span>
      </div>
      <div className="flex gap-3">
        <Avatar name={creator.name} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug text-surface-900">
            {video.titulo}
          </h3>
          <p className="mt-1 truncate text-sm text-surface-600">{creator.name}</p>
          <p className="text-sm text-surface-600">
            {formatViews(video.views)} · {formatRelativeDate(video.publishedAt)}
          </p>
        </div>
      </div>
    </Link>
  )
}
