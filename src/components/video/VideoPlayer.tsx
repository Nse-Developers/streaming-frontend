import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings } from 'lucide-react'
import { cn } from '@/lib/cn'

interface VideoPlayerProps {
  src?: string
  poster?: string
  /** Duração simulada em segundos, usada quando não há arquivo de vídeo real. */
  simulatedDuration?: number
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VideoPlayer({ src, poster, simulatedDuration = 754 }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const duration = simulatedDuration

  // Protótipo: sem arquivo de vídeo real, a reprodução é simulada por um timer
  // para que os controles, a barra de progresso e os estados fiquem avaliáveis.
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= duration) {
          setIsPlaying(false)
          return duration
        }
        return prev + 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, duration])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const progress = duration ? currentTime / duration : 0

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else containerRef.current?.requestFullscreen()
  }

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {src ? (
        <video src={src} poster={poster} className="h-full w-full" />
      ) : (
        poster && <img src={poster} alt="" className="h-full w-full object-cover" />
      )}

      {!isPlaying && (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35"
          aria-label="Reproduzir"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-transform duration-200 hover:scale-105">
            <Play size={28} fill="currentColor" className="ml-1" />
          </span>
        </button>
      )}

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2.5 pt-10 transition-opacity duration-200',
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div
          className="relative mb-1 h-4 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setCurrentTime(((e.clientX - rect.left) / rect.width) * duration)
          }}
        >
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/25">
            <div className="relative h-full rounded-full bg-brand-500" style={{ width: `${progress * 100}%` }}>
              <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand-500 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white">
          <ControlButton onClick={() => setIsPlaying((v) => !v)} label={isPlaying ? 'Pausar' : 'Reproduzir'}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </ControlButton>

          <ControlButton onClick={() => setIsMuted((v) => !v)} label={isMuted ? 'Ativar som' : 'Silenciar'}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </ControlButton>

          <span className="ml-1.5 font-mono text-xs tabular-nums text-white/85">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <ControlButton onClick={() => {}} label="Configurações">
              <Settings size={19} />
            </ControlButton>
            <ControlButton onClick={toggleFullscreen} label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
              {isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
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
