import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Volume1,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  VideoOff,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface VideoPlayerProps {
  /** URL do arquivo. Hoje a API não devolve este campo em VideoResponse. */
  src?: string | null
  poster?: string | null
  title?: string
}

/** Volume escolhido pelo usuário, lembrado entre vídeos e entre sessões.
 *
 *  Sem isto o volume voltaria a 100% a cada vídeo aberto, e quem baixou o som
 *  uma vez levaria um susto no próximo — é o comportamento que todo player
 *  conhecido tem. Guardado como 0–1 (a escala do elemento <video>); a UI
 *  converte para 0–100 só na hora de exibir. */
const VOLUME_KEY = 'byou.player.volume'
const MUTED_KEY = 'byou.player.muted'

/** Inatividade até esconder controles e cursor, com o vídeo rodando.
 *  3s é o valor usado pelo YouTube — curto o bastante para sair da frente,
 *  longo o bastante para não sumir enquanto a mão vai até o botão. */
const HIDE_DELAY_MS = 3000

function loadVolume(): number {
  const raw = Number(localStorage.getItem(VOLUME_KEY))
  // Number(null) é 0, então um storage vazio cairia em "mudo" sem o isFinite:
  // o padrão precisa ser 100%, não silêncio.
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 1
}

function loadMuted(): boolean {
  return localStorage.getItem(MUTED_KEY) === 'true'
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
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(loadMuted)
  const [volume, setVolume] = useState(loadVolume)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // O <video> nasce com volume 1 e muted false: aplica o que foi lembrado
  // assim que o elemento existe. `src` na dependência porque trocar de vídeo
  // remonta o elemento e zera essas propriedades.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    video.muted = isMuted
    // Só na montagem/troca de vídeo — durante o uso quem manda são os handlers,
    // e reaplicar aqui a cada mudança brigaria com o arrasto do slider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume))
    localStorage.setItem(MUTED_KEY, String(isMuted))
  }, [volume, isMuted])

  /** Mostra os controles e reinicia a contagem para escondê-los.
   *
   *  Chamado a cada sinal de "o usuário está aqui" (mouse, toque, tecla). O
   *  timer anterior é sempre cancelado: sem isso, mexer o mouse por 3 segundos
   *  agendaria dezenas de timers e o primeiro deles esconderia os controles no
   *  meio do movimento. */
  const revealControls = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    // Só esconde durante a reprodução: com o vídeo pausado, os controles ficam
    // à mão (é o que o YouTube faz — some só quando há algo para assistir).
    if (!videoRef.current?.paused) {
      hideTimer.current = setTimeout(() => setShowControls(false), HIDE_DELAY_MS)
    }
  }, [])

  // Enquanto pausado os controles ficam fixos; ao dar play, começa a contagem.
  useEffect(() => {
    revealControls()
  }, [isPlaying, revealControls])

  // Limpa o timer ao desmontar: sem isto, um setState dispararia num componente
  // que já saiu da tela (o usuário navegou para outro vídeo).
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  /** Atalhos de teclado, no documento (como no YouTube): funcionam sem exigir
   *  que o usuário clique no vídeo antes.
   *
   *  O cuidado central é NÃO sequestrar teclas de quem está escrevendo: a
   *  página do vídeo tem o campo de comentário logo abaixo, e um Space que
   *  pausasse o vídeo em vez de escrever um espaço seria muito pior do que não
   *  ter atalho nenhum. Daí a checagem de campo editável antes de tudo. */
  // Sem vídeo reproduzível não há o que controlar: o listener nem é registrado,
  // senão Space continuaria sendo sequestrado numa tela que só mostra a capa.
  const canPlay = Boolean(src) && !failed

  useEffect(() => {
    if (!canPlay) return

    const isTyping = () => {
      const el = document.activeElement
      if (!(el instanceof HTMLElement)) return false
      return (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable
      )
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping() || event.ctrlKey || event.metaKey || event.altKey) return
      const video = videoRef.current
      if (!video) return

      // Setas ficam fora quando o foco está num controle nativo (o slider de
      // volume e a barra de progresso já as tratam) — senão o volume mudaria
      // duas vezes no mesmo toque.
      const onSlider =
        document.activeElement instanceof HTMLElement &&
        document.activeElement.closest('[data-player-control]') !== null

      // Age direto no elemento, sem chamar os handlers declarados mais abaixo:
      // eles seriam capturados pela closure deste effect e ficariam presos ao
      // primeiro render. `videoRef` é estável, então isto lê sempre o estado
      // atual do vídeo.
      const setVolumeBy = (delta: number) => {
        const next = Math.min(Math.max(video.volume * 100 + delta, 0), 100) / 100
        video.volume = next
        video.muted = next === 0
      }

      switch (event.key) {
        case ' ':
        case 'k':
        case 'K':
          event.preventDefault() // Space rolaria a página
          if (video.paused) void video.play()
          else video.pause()
          break
        case 'ArrowLeft':
          if (onSlider) return
          event.preventDefault()
          video.currentTime = Math.max(0, video.currentTime - 5)
          break
        case 'ArrowRight':
          if (onSlider) return
          event.preventDefault()
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5)
          break
        case 'ArrowUp':
          if (onSlider) return
          event.preventDefault()
          setVolumeBy(5)
          break
        case 'ArrowDown':
          if (onSlider) return
          event.preventDefault()
          setVolumeBy(-5)
          break
        case 'm':
        case 'M':
          if (video.muted && video.volume === 0) video.volume = 0.5
          video.muted = !video.muted
          break
        case 'f':
        case 'F':
          if (document.fullscreenElement) void document.exitFullscreen()
          else void containerRef.current?.requestFullscreen()
          break
        default:
          return
      }
      // Qualquer atalho conta como atividade: os controles reaparecem e o
      // usuário vê o efeito do que acabou de apertar.
      revealControls()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [revealControls, canPlay])

  if (!canPlay) {
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

  /** Volume vindo do slider, em 0–100. */
  const changeVolume = (percent: number) => {
    const video = videoRef.current
    if (!video) return
    const next = Math.min(Math.max(percent, 0), 100) / 100
    video.volume = next
    // Arrastar o slider para cima tem que tirar do mudo, senão o usuário
    // aumenta o volume e não ouve nada. Arrastar até 0 é o inverso: equivale
    // a silenciar.
    video.muted = next === 0
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    // Desmutar com o volume em 0 continuaria sem som — o botão pareceria
    // quebrado. Nesse caso devolve um volume audível junto.
    if (video.muted && video.volume === 0) video.volume = 0.5
    video.muted = !video.muted
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
      className={cn(
        'group relative aspect-video w-full overflow-hidden rounded-xl bg-black',
        // Some com o cursor junto dos controles: em tela cheia, uma seta parada
        // no meio do filme incomoda tanto quanto a barra.
        !showControls && 'cursor-none',
      )}
      onMouseMove={revealControls}
      onMouseEnter={revealControls}
      // Sair com o vídeo rodando esconde na hora, sem esperar os 3s.
      onMouseLeave={() => isPlaying && setShowControls(false)}
      // Em telas de toque não existe "mover o mouse": o toque é o sinal de
      // atividade que traz os controles de volta.
      onTouchStart={revealControls}
    >
      <video
        ref={videoRef}
        src={src ?? undefined}
        poster={poster ?? undefined}
        title={title}
        playsInline
        // O Chrome injeta um botão de Cast por conta própria em qualquer
        // <video> quando há um Chromecast na rede — mesmo sem `controls`. Ele
        // aparecia flutuando no canto, fora da nossa barra, e some junto dela
        // no auto-hide (ficava sozinho sobre o vídeo). Sem suporte a Cast
        // implementado de verdade, é melhor não oferecer o botão.
        disableRemotePlayback
        // Mesma ideia para o Picture-in-Picture do Chrome, que entra no menu
        // de contexto e no mesmo canto.
        disablePictureInPicture
        className="h-full w-full"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        // Única fonte de verdade do volume: o próprio elemento. Vale tanto
        // para as mudanças feitas aqui quanto para as de fora (teclas de mídia
        // do teclado, controles nativos da tela cheia).
        onVolumeChange={(event) => {
          setIsMuted(event.currentTarget.muted)
          setVolume(event.currentTarget.volume)
        }}
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
          // Invisível também precisa ficar inerte: só `opacity-0` deixaria a
          // barra capturando cliques que deveriam ir para o vídeo (e pausar).
          showControls || !isPlaying
            ? 'opacity-100'
            : 'pointer-events-none opacity-0',
        )}
      >
        <div
          className="relative mb-1 h-4 cursor-pointer"
          onClick={seek}
          role="slider"
          tabIndex={0}
          data-player-control
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

          {/* Volume: botão de mudo + slider. O slider se revela no hover (ou
              no foco por teclado) para não competir com a barra de progresso,
              e fica sempre visível no toque, onde não existe hover. */}
          <div className="group/vol flex items-center">
            <ControlButton onClick={toggleMute} label={isMuted ? 'Ativar som' : 'Silenciar'}>
              <VolumeIcon muted={isMuted} volume={volume} />
            </ControlButton>

            <input
              type="range"
              min={0}
              max={100}
              // Mudo mostra a barra vazia mesmo com volume guardado: é o que o
              // usuário está ouvindo (nada), e voltar do mudo repõe a posição.
              value={Math.round(isMuted ? 0 : volume * 100)}
              onChange={(event) => changeVolume(Number(event.target.value))}
              aria-label="Volume"
              aria-valuetext={`${Math.round(isMuted ? 0 : volume * 100)}%`}
              // Marca para o handler global de teclado não tratar as setas de
              // novo quando o foco já está aqui (o range as trata sozinho).
              data-player-control
              // O Chrome não tem pseudo-elemento para a parte preenchida do
              // slider (só o Firefox, via ::-moz-range-progress). O gradiente
              // com parada dura na posição atual desenha esse "já preenchido"
              // igual nos dois — por isso vem daqui, e não do CSS.
              style={{
                backgroundImage: `linear-gradient(to right, #fff ${
                  Math.round(isMuted ? 0 : volume * 100)
                }%, rgb(255 255 255 / 0.3) ${Math.round(isMuted ? 0 : volume * 100)}%)`,
              }}
              className="volume-slider h-1 w-0 cursor-pointer opacity-0 transition-[width,opacity] duration-200 focus-visible:w-16 focus-visible:opacity-100 group-hover/vol:w-16 group-hover/vol:opacity-100 sm:group-hover/vol:w-20"
            />
          </div>

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

/** Ícone que reflete o nível: mudo, volume baixo ou alto. Três estados em vez
 *  de dois porque com um ícone só o usuário não distingue "baixo" de "alto"
 *  sem olhar o slider. */
function VolumeIcon({ muted, volume }: { muted: boolean; volume: number }) {
  if (muted || volume === 0) return <VolumeX size={19} />
  if (volume < 0.5) return <Volume1 size={19} />
  return <Volume2 size={19} />
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
