import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, VideoOff } from 'lucide-react'
import { cn } from '@/lib/cn'

interface VideoPlayerProps {
  /** URL do arquivo. Hoje a API não devolve este campo em VideoResponse. */
  src?: string | null
  poster?: string | null
  title?: string
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return h > 0
    ? `${h}:${mm}:${String(s).padStart(2, '0')}`
    : `${mm}:${String(s).padStart(2, '0')}`
}

/** Player real, controlando um <video> de verdade.
 *
 *  Quando `src` está ausente (situação atual da API), mostra a capa com um
 *  aviso claro em vez de simular uma reprodução que não existe. */
export function VideoPlayer({ src, poster, title }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const unavailable = !src || failed

  if (unavailable) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {poster && (
          <img src={poster} alt="" className="h-full w-full object-cover opacity-35" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <VideoOff size={30} className="text-white/60" />
          <p className="font-display text-sm font-semibold text-white/90">
            Vídeo indisponível para reprodução
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-white/60">
            {failed
              ? 'O arquivo não pôde ser carregado.'
              : 'A API ainda não devolve a URL do arquivo de vídeo nesta resposta.'}
          </p>
        </div>
      </div>
    )
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void containerRef.current?.requestFullscreen()
  }

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !duration) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    video.currentTime = Math.min(Math.max(ratio, 0), 1) * duration
  }

  const progress = duration ? currentTime / duration : 0

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        title={title}
        playsInline
        className="h-full w-full"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
        onError={() => setFailed(true)}
        onEnded={() => setIsPlaying(false)}
      />

      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35"
          aria-label="Reproduzir"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-transform duration-200 hover:scale-105 sm:h-16 sm:w-16">
            <Play size={26} fill="currentColor" className="ml-1" />
          </span>
        </button>
      )}

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2.5 pb-2 pt-10 transition-opacity duration-200 sm:px-3 sm:pb-2.5',
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div
          className="relative mb-1 h-4 cursor-pointer"
          onClick={seek}
          role="slider"
          tabIndex={0}
          aria-label="Progresso do vídeo"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
          onKeyDown={(event) => {
            const video = videoRef.current
            if (!video) return
            if (event.key === 'ArrowRight') video.currentTime += 5
            if (event.key === 'ArrowLeft') video.currentTime -= 5
          }}
        >
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/25">
            <div
              className="relative h-full rounded-full bg-brand-500"
              style={{ width: `${progress * 100}%` }}
            >
              <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand-500 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 text-white sm:gap-1">
          <ControlButton onClick={togglePlay} label={isPlaying ? 'Pausar' : 'Reproduzir'}>
            {isPlaying ? (
              <Pause size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
          </ControlButton>

          <ControlButton
            onClick={() => {
              const video = videoRef.current
              if (video) video.muted = !video.muted
            }}
            label={isMuted ? 'Ativar som' : 'Silenciar'}
          >
            {isMuted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </ControlButton>

          <span className="ml-1 font-mono text-[11px] tabular-nums text-white/85 sm:text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="ml-auto">
            <ControlButton
              onClick={toggleFullscreen}
              label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-ring"
    >
      {children}
    </button>
  )
}
