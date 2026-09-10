import { Link } from 'react-router-dom'
import { ImageOff, Play } from 'lucide-react'
import { VerifiedBadge } from '@/components/user/VerifiedBadge'
import { useVerifiedById } from '@/hooks/useUsers'
import type { UiVideo } from '@/lib/video'
import { formatRelativeDate } from '@/lib/format'

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
  const creatorIsVerified = video.userIsVerified ?? useVerifiedById(video.userId)

  return (
    <>
      {/* max-h impede o destaque de empurrar o feed para fora da primeira
          dobra em telas largas — o aspect-ratio sozinho cresce sem limite. */}
      <div className="aspect-[16/10] max-h-[62vh] w-full sm:aspect-[21/9] min-[880px]:aspect-[2.6/1] lg:aspect-[2.8/1]">
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
        // No toque não existe hover: o botão de play NUNCA aparecia, e o
        // destaque ficava sem qualquer sinal de que era clicável. Abaixo de
        // `sm` ele fica sempre visível; no ponteiro fino segue revelando-se no
        // hover (e agora também no foco por teclado, que tinha o mesmo furo).
        <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-surface-900 shadow-elevated">
            <Play size={26} fill="currentColor" className="ml-0.5" />
          </span>
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-7 lg:p-9">
        {/* O bloco de texto é absoluto e ancorado embaixo, então ele cresce
            para CIMA — e a altura do destaque é fixada pelo aspect-ratio. Um
            título longo em 320px passava de quatro linhas e escapava por cima
            do gradiente, ficando sobre a parte clara da capa. O clamp segura
            em duas linhas no mobile e três a partir de sm, onde há altura. */}
        <h2 className="line-clamp-2 max-w-3xl font-display text-xl font-extrabold leading-[1.12] tracking-tight text-white sm:line-clamp-3 sm:text-3xl lg:text-[2.4rem]">
          {video.tittle}
        </h2>

        {video.description && (
          // `hidden` era desfeito só pelo `display:-webkit-box` que o
          // `line-clamp` traz de brinde — trocar o clamp quebraria a
          // visibilidade sem aviso. `sm:block` torna a intenção explícita.
          <p className="mt-2 hidden max-w-xl text-sm leading-relaxed text-white/70 sm:block sm:line-clamp-2">
            {video.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/70 sm:text-sm">
          {/* `tone="media"`: aqui o fundo é a capa do vídeo sob um gradiente
              preto nos DOIS temas, e o accent-ink do tema claro (verde-escuro)
              desapareceria nele. Branco, como o nome ao lado. */}
          <span className="inline-flex items-center gap-1 font-semibold text-white">
            {video.creatorName}
            <VerifiedBadge verified={creatorIsVerified} size="sm" tone="media" />
          </span>
          {/* TEMP: contagem de visualizacoes escondida a pedido do time.
              Para voltar, reponha o separador + o span abaixo:
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatViews(video.views)}</span> */}
          <span aria-hidden="true">·</span>
          <span>{formatRelativeDate(video.uploadDate)}</span>
        </div>
      </div>
    </>
  )
}
