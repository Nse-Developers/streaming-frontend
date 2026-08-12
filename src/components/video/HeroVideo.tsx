import { Link } from 'react-router-dom'
import { ImageOff, Play } from 'lucide-react'
import type { UiVideo } from '@/lib/video'
import { formatViews, formatRelativeDate } from '@/lib/format'

const SHELL_CLASS = 'group relative block overflow-hidden rounded-2xl bg-surface-200'

/** Destaque da home. Vira link para /videos/:id quando o id existe; sem ele
 *  (versão antiga do backend, ver PENDENCIAS.md) mostra os dados sem navegar. */
export function HeroVideo({ video }: { video: UiVideo }) {
  const body = <HeroBody video={video} />

  if (video.id != null) {
    return (
      <Link to={`/videos/${video.id}`} className={`${SHELL_CLASS} focus-ring`}>
        {body}
      </Link>
    )
  }

  return <section className={SHELL_CLASS}>{body}</section>
}

function HeroBody({ video }: { video: UiVideo }) {
  return (
    <>
      {/* max-h impede o destaque de empurrar o feed para fora da primeira
          dobra em telas largas — o aspect-ratio sozinho cresce sem limite. */}
      <div className="aspect-[16/10] max-h-[62vh] w-full sm:aspect-[21/9] lg:aspect-[2.8/1]">
        {video.safeThumbnail ? (
          <img
            src={video.safeThumbnail}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-surface-500">
            <ImageOff size={34} />
          </div>
        )}
      </div>

      {/* Gradiente forte embaixo: o texto tem que ficar legível sobre qualquer capa. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"
      />

      {video.id != null && (
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-surface-900 shadow-elevated">
            <Play size={26} fill="currentColor" className="ml-0.5" />
          </span>
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7 lg:p-9">
        <h2 className="max-w-3xl font-display text-xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-3xl lg:text-[2.4rem]">
          {video.tittle}
        </h2>

        {video.description && (
          <p className="mt-2 hidden max-w-xl text-sm leading-relaxed text-white/70 sm:line-clamp-2">
            {video.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/70 sm:text-sm">
          <span className="font-semibold text-white">{video.creatorName}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatViews(video.views)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatRelativeDate(video.uploadDate)}</span>
        </div>
      </div>
    </>
  )
}
