import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Volume1,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  VideoOff,
} from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'

interface VideoPlayerProps {
  /** URL ASSINADA do arquivo, válida por 6 horas (ver GET /video/{id}).
   *  Não guardar em cache nem tratar como permanente: quando expira, o
   *  <video> falha e a saída é buscar o vídeo de novo — é o que `onRetry` faz. */
  src?: string | null
  poster?: string | null
  title?: string
  /** Rebusca o vídeo na API para obter uma URL assinada nova. Sem isto, um
   *  player aberto por mais de 6 horas fica morto até um F5 manual. */
  onRetry?: () => void
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

/** Salto dos botões de avançar/voltar da barra de controles.
 *
 *  Estes botões existem por causa do toque: as setas do teclado já davam esse
 *  controle no desktop, mas num celular não havia NENHUMA forma de voltar
 *  alguns segundos — só arrastar a barra de progresso, que num vídeo longo
 *  move minutos por milímetro.
 *
 *  10s (e não os 5s das setas) é o passo que YouTube, Netflix e Prime usam no
 *  toque: sem a repetição fácil de uma tecla segurada, cada toque precisa
 *  render mais. */
const SKIP_SECONDS = 10

/** Salto das setas do teclado — passo fino, para quem pode repetir a tecla. */
const ARROW_SKIP_SECONDS = 5

/** Trava a orientação da tela enquanto o player está em tela cheia.
 *
 *  Um vídeo vertical (reels) numa tela cheia deitada vira duas tarjas pretas
 *  gigantes com uma fita de imagem no meio; um vídeo 16:9 numa tela em pé
 *  ocupa um terço do aparelho. Qual das duas é a certa depende do ARQUIVO, não
 *  do aparelho — daí a trava seguir a proporção do vídeo.
 *
 *  Falha de propósito em silêncio: a API não existe no Safari, é recusada em
 *  desktop, e o próprio sistema pode negar quando o usuário tem o bloqueio de
 *  rotação ligado. Em todos esses casos a tela cheia continua funcionando, só
 *  sem girar — que é exatamente o comportamento de hoje. */
type OrientationLock = 'portrait' | 'landscape'

interface LockableOrientation {
  lock?: (orientation: OrientationLock) => Promise<void>
  unlock?: () => void
}

function screenOrientation(): LockableOrientation | undefined {
  return typeof screen === 'undefined'
    ? undefined
    : (screen.orientation as LockableOrientation | undefined)
}

function lockOrientation(mode: OrientationLock): void {
  const orientation = screenOrientation()
  if (typeof orientation?.lock !== 'function') return
  // `lock` devolve uma promise que REJEITA quando não é suportado. Sem o
  // catch isso vira "Unhandled promise rejection" no console a cada tela
  // cheia aberta no desktop.
  orientation.lock(mode).catch(() => {})
}

function unlockOrientation(): void {
  const orientation = screenOrientation()
  if (typeof orientation?.unlock !== 'function') return
  // Ao contrário do lock, `unlock` é síncrono e LANÇA quando não suportado.
  try {
    orientation.unlock()
  } catch {
    // Sem suporte não havia trava para desfazer.
  }
}

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
export function VideoPlayer({ src, poster, title, onRetry }: VideoPlayerProps) {
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
  /** Vídeo parado esperando rede. Sem isto, um stream que engasga no meio
   *  mostrava só um quadro congelado: nada distinguia "carregando" de
   *  "travou". `onWaiting`/`onPlaying` são os eventos que o próprio elemento
   *  emite ao esvaziar e reabastecer o buffer. */
  const [isBuffering, setIsBuffering] = useState(false)
  /** Vídeo mais alto que largo (reels/short). Em ref, não em state: só é lido
   *  dentro de callbacks, e um state faria o player re-renderizar à toa quando
   *  os metadados chegam. */
  const isPortraitVideo = useRef(false)

  useEffect(() => {
    const onChange = () => {
      const active = Boolean(document.fullscreenElement)
      setIsFullscreen(active)
      // Destrava ao sair — inclusive quando a saída não passa pelo nosso botão
      // (Esc, gesto de voltar do Android). Sem isto o aparelho ficaria preso
      // na orientação do último vídeo assistido, no site inteiro.
      if (!active) unlockOrientation()
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      // Desmontar durante a tela cheia (navegar para outro vídeo) também
      // precisa devolver a rotação ao aparelho.
      unlockOrientation()
    }
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
      hideTimer.current = setTimeout(() => {
        // Mover o mouse conta como atividade, mas FOCO de teclado não contava:
        // quem tabulava até "Tela cheia" e parava 3s ficava com o foco num
        // botão invisível (opacity-0), e o Tab seguia por elementos que ninguém
        // vê. Enquanto o foco estiver dentro do player, os controles ficam.
        //
        // `:focus-visible`, e não `contains(activeElement)`: TOCAR num botão
        // também deixa o foco nele, então a versão anterior travava os
        // controles para sempre no celular. O caso real era entrar em tela
        // cheia pelo botão — o foco ficava em "Sair da tela cheia", dentro do
        // player, e o auto-hide nunca mais rodava com o vídeo tocando.
        // `:focus-visible` é justamente o sinal do navegador para "este foco
        // veio do teclado", que é o único caso que esta guarda quer proteger.
        const focused = containerRef.current?.querySelector(':focus-visible')
        if (focused) return
        setShowControls(false)
      }, HIDE_DELAY_MS)
    }
  }, [])

  // Enquanto pausado os controles ficam fixos; ao dar play, começa a contagem.
  //
  // `isFullscreen` também dispara: entrar em tela cheia não muda `isPlaying`,
  // então sem isto a contagem não era reiniciada no exato momento em que o
  // usuário mais quer a tela limpa. O toque no botão foi a última interação —
  // daqui a 3s os controles saem da frente.
  useEffect(() => {
    revealControls()
  }, [isPlaying, isFullscreen, revealControls])

  // Limpa o timer ao desmontar: sem isto, um setState dispararia num componente
  // que já saiu da tela (o usuário navegou para outro vídeo).
  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  /** Alterna a tela cheia e aplica a trava de orientação.
   *
   *  Fica aqui em cima, entre os hooks, e não junto de `togglePlay`: é um
   *  `useCallback`, e lá embaixo já passou do `return` de vídeo
   *  indisponível — um hook depois de um return condicional muda a ordem dos
   *  hooks entre renders e quebra o React quando o vídeo falha. */
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    // A trava só é aceita com a tela cheia JÁ ativa, por isso vai no `then` e
    // não antes. Vertical continua em pé; todo o resto (16:9, 4:3, quadrado)
    // deita, que é o que aproveita a tela do aparelho.
    void containerRef.current
      ?.requestFullscreen()
      .then(() => lockOrientation(isPortraitVideo.current ? 'portrait' : 'landscape'))
      .catch(() => {})
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
          video.currentTime = Math.max(0, video.currentTime - ARROW_SKIP_SECONDS)
          break
        case 'ArrowRight':
          if (onSlider) return
          event.preventDefault()
          video.currentTime = Math.min(
            video.duration || 0,
            video.currentTime + ARROW_SKIP_SECONDS,
          )
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
          // Mesmo caminho do botão: escrito à parte, a tecla entrava em tela
          // cheia sem aplicar a trava de orientação.
          toggleFullscreen()
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
  }, [revealControls, canPlay, toggleFullscreen])

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
              ? // A causa mais provável é o link assinado ter expirado (6 h),
                // e não um arquivo corrompido — a mensagem aponta para a ação
                // que resolve em vez de sugerir um problema permanente.
                'O link de reprodução expirou ou o arquivo não pôde ser carregado.'
              : 'Este vídeo ainda não tem arquivo disponível para reprodução.'}
          </p>
          {failed && onRetry && (
            <button
              type="button"
              onClick={() => {
                setFailed(false)
                onRetry()
              }}
              className="mt-1 min-h-11 rounded-lg px-4 text-xs font-semibold text-white underline underline-offset-4 hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Tentar novamente
            </button>
          )}
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

  /** Avança (positivo) ou volta (negativo) no vídeo, sem passar das pontas. */
  const skipBy = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    // Antes do `loadedmetadata` a duração é NaN. Sem esta guarda o clamp
    // usaria 0 como total e um "avançar" mandaria o vídeo para o começo.
    if (!Number.isFinite(video.duration)) return
    video.currentTime = Math.min(
      Math.max(video.currentTime + seconds, 0),
      video.duration,
    )
    // O salto conta como atividade: sem isto, tocar em "avançar" com os
    // controles prestes a sumir escondia a barra logo depois do toque.
    revealControls()
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

  /** Barra de controles à mostra. Pausado ela fica fixa; tocando, some após a
   *  inatividade. Também governa o `pointer-events` dos controles: invisível
   *  e clicável ao mesmo tempo roubaria o toque do vídeo. */
  const controlsVisible = showControls || !isPlaying

  return (
    <div
      ref={containerRef}
      className={cn(
        // `player-shell` traz a regra de tela cheia (ver index.css): sem ela o
        // aspect-video fixo deixava tarjas laterais num celular deitado (20:9).
        // `max-h-[78svh]` + `mx-auto`: o aspect-video sozinho deixava o player
        // com 116-121% da ALTURA da tela num celular deitado (medido: 370px de
        // player em 320px de tela), entao o video nascia maior que o viewport e
        // empurrava titulo e controles para fora. Com o teto, a altura manda e
        // a largura acompanha a proporcao, centrada.
        // `svh` e nao `vh`: no celular o `vh` conta a tela com a barra de
        // endereco recolhida, o mesmo motivo pelo qual o AuthShell usa `dvh`.
        'player-shell group relative mx-auto aspect-video max-h-[78svh] w-full overflow-hidden rounded-xl bg-black',
        // Some com o cursor junto dos controles: em tela cheia, uma seta parada
        // no meio do filme incomoda tanto quanto a barra.
        !showControls && 'cursor-none',
      )}
      onMouseMove={revealControls}
      onMouseEnter={revealControls}
      // Foco entrando em qualquer controle traz a barra de volta: sem isto,
      // tabular para dentro do player com os controles escondidos deixava o
      // foco num elemento invisível.
      onFocusCapture={revealControls}
      // Sair com o vídeo rodando esconde na hora, sem esperar os 3s.
      onMouseLeave={() => isPlaying && setShowControls(false)}
      // Em telas de toque não existe "mover o mouse": o toque é o sinal de
      // atividade que traz os controles de volta.
      onTouchStart={revealControls}
    >
      {/* Os atalhos só eram descobríveis lendo o código. Aqui ficam
          disponíveis para leitor de tela sem poluir a interface visual. */}
      <p className="sr-only">
        Atalhos: espaço ou K reproduz e pausa, setas esquerda e direita avançam
        e voltam 5 segundos, setas cima e baixo ajustam o volume, M silencia, F
        alterna tela cheia.
      </p>

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
        // `object-contain`: em tela cheia o contêiner passa a ter a proporção
        // do APARELHO, não a do arquivo (ver `.player-shell:fullscreen`). Sem
        // isto um vídeo vertical seria esticado para preencher a tela deitada.
        className="h-full w-full object-contain"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration)
          // `videoWidth/Height` são as dimensões REAIS do arquivo, e só
          // existem a partir daqui — antes dos metadados valem 0.
          const { videoWidth, videoHeight } = event.currentTarget
          isPortraitVideo.current = videoHeight > videoWidth
        }}
        // Única fonte de verdade do volume: o próprio elemento. Vale tanto
        // para as mudanças feitas aqui quanto para as de fora (teclas de mídia
        // do teclado, controles nativos da tela cheia).
        onVolumeChange={(event) => {
          setIsMuted(event.currentTarget.muted)
          setVolume(event.currentTarget.volume)
        }}
        onError={() => setFailed(true)}
        onEnded={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false)
          setIsPlaying(true)
        }}
        onCanPlay={() => setIsBuffering(false)}
      />

      {/* Só enquanto o vídeo tenta tocar: parado por pausa não é buffer.
          `pointer-events-none` para não roubar o clique de play/pause do
          próprio vídeo, que ocupa a mesma área. */}
      {isBuffering && isPlaying && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          role="status"
        >
          <Spinner size={34} className="text-white" />
          <span className="sr-only">Carregando o vídeo…</span>
        </div>
      )}

      {/* Só escurecimento, sem capturar toque: quem trata o toque nesta área é
          o próprio <video> (`onClick={togglePlay}`), que está por baixo. O
          botão redondo é irmão desta camada e vive no FIM do componente, para
          ficar por cima da barra de controles. */}
      {!isPlaying && (
        <div className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden />
      )}

      <div
        className={cn(
          // `pt-10` (40px de gradiente) somado ao resto dava 157px de barra num
          // player que no celular tem 162px: 87% do quadro coberto pelo
          // gradiente, o que fazia o player parecer "todo controle e nenhum
          // video". Com `pt-3` no toque a barra fecha em 92px (57%); do `sm`
          // para cima nada muda, onde o player e alto o bastante.
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2.5 pb-2 pt-3 transition-opacity duration-200 sm:px-3 sm:pb-2.5 sm:pt-10',
          // A CAIXA da barra é inerte; só os controles de verdade (progresso e
          // fileira de botões) recebem toque, via `pointer-events-auto`.
          //
          // Sem isto, os 40px de `pt-10` — que são gradiente transparente,
          // sem nada clicável — capturavam o toque como qualquer div. Somados
          // ao resto, a barra media 157px de um player que no celular tem
          // 162–254px de altura: ela cobria o botão de play central inteiro, e
          // tocá-lo não fazia nada. Só aparecia no mobile porque no desktop o
          // player é alto o bastante para os 157px não alcançarem o meio.
          'pointer-events-none',
          // Invisível também precisa ficar inerte: só `opacity-0` deixaria a
          // barra capturando cliques que deveriam ir para o vídeo (e pausar).
          controlsVisible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div
          // A faixa clicável media 16px de altura. O trilho VISÍVEL tem 4px e
          // fica centrado nela, então a área extra já era só folga de clique —
          // mas 16px continua metade do alvo mínimo de toque, e num celular
          // errar a barra de progresso significa tocar o vídeo e pausá-lo.
          // No toque a folga sobe para 44px; o trilho desenhado não muda de
          // tamanho (é o filho absoluto, centrado por `top-1/2`), então no
          // ponteiro fino a aparência segue idêntica.
          className={cn(
            // No toque a faixa cai de 44px para 24px. Duas medicoes levaram a
            // este numero, as duas com elementFromPoint varrendo a coluna
            // central do player:
            //
            //   1. Margem negativa para recolher a folga invisivel sobrepunha a
            //      faixa aos vizinhos: os 14px de cima de CADA botao passavam a
            //      disparar seek, e tocar o topo de "play" pulava o video.
            //   2. Com 32px, num player de 162px (celular pequeno na coluna de
            //      conteudo) a faixa cobria justamente o MEIO do quadro, e o
            //      toque no centro do video dava seek para 30s em vez de tocar
            //      — o gesto mais basico do player.
            //
            // 24px continua acima da folga original de 16px do ponteiro fino, e
            // o trilho atravessa a largura inteira: errar exige mirar na faixa
            // estreita entre o video e a fileira de botoes.
            'group/bar relative mb-1 h-4 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 max-sm:h-6',
            // Devolve o toque que o `pointer-events-none` do pai tirou — mas
            // só enquanto a barra está visível, senão os controles seguiriam
            // clicáveis invisíveis por cima do vídeo.
            controlsVisible ? 'pointer-events-auto' : 'pointer-events-none',
          )}
          onClick={seek}
          role="slider"
          tabIndex={0}
          data-player-control
          aria-label="Progresso do vídeo"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
          // Sem isto o leitor de tela anunciava só o número de segundos cru
          // ("437"), sem unidade nem sentido.
          aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
          onKeyDown={(event) => {
            const video = videoRef.current
            if (!video) return
            const total = video.duration || 0
            const to = (seconds: number) => {
              video.currentTime = Math.min(Math.max(seconds, 0), total)
            }
            switch (event.key) {
              case 'ArrowRight':
                to(video.currentTime + ARROW_SKIP_SECONDS)
                break
              case 'ArrowLeft':
                to(video.currentTime - ARROW_SKIP_SECONDS)
                break
              // O papel `slider` faz o leitor de tela prometer estas teclas;
              // sem elas, navegar um vídeo longo de 5 em 5s é inviável.
              case 'PageUp':
                to(video.currentTime + 30)
                break
              case 'PageDown':
                to(video.currentTime - 30)
                break
              case 'Home':
                to(0)
                break
              case 'End':
                to(total)
                break
              default:
                return
            }
            // Sem preventDefault, ArrowRight/PageDown rolavam a página ALÉM de
            // mover o vídeo.
            event.preventDefault()
            revealControls()
          }}
        >
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-white/25">
            <div
              className="relative h-full rounded-full bg-brand-500"
              style={{ width: `${progress * 100}%` }}
            >
              <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-brand-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible/bar:opacity-100" />
            </div>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-0.5 text-white sm:gap-1',
            controlsVisible ? 'pointer-events-auto' : 'pointer-events-none',
          )}
        >
          {/* Voltar/avançar ladeando o play, na ordem de transporte que todo
              player usa. Sem atalho declarado no `aria-keyshortcuts`: as setas
              saltam 5s e estes botões 10s, então anunciar a tecla aqui
              prometeria um resultado diferente do que ela faz. */}
          <ControlButton
            onClick={() => skipBy(-SKIP_SECONDS)}
            label={`Voltar ${SKIP_SECONDS} segundos`}
          >
            <SkipIcon direction="back" />
          </ControlButton>

          <ControlButton
            onClick={togglePlay}
            label={isPlaying ? 'Pausar' : 'Reproduzir'}
            keyShortcut="k"
          >
            {isPlaying ? (
              <Pause size={19} fill="currentColor" />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
          </ControlButton>

          <ControlButton
            onClick={() => skipBy(SKIP_SECONDS)}
            label={`Avançar ${SKIP_SECONDS} segundos`}
          >
            <SkipIcon direction="forward" />
          </ControlButton>

          {/* Volume: botão de mudo + slider. O slider se revela no hover (ou
              no foco por teclado) para não competir com a barra de progresso,
              e fica sempre visível no toque, onde não existe hover. */}
          <div className="group/vol flex items-center">
            <ControlButton
              onClick={toggleMute}
              label={isMuted ? 'Ativar som' : 'Silenciar'}
              keyShortcut="m"
            >
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
              // step 5 para casar com as setas do atalho global (que mexem 5%);
              // com o padrão 1 o mesmo gesto tinha duas granularidades.
              step={5}
              // hidden no mobile: sem hover ele nunca se revelava, e um alvo de
              // 0px de largura é inalcançável ao toque. Lá o botão de mudo e as
              // teclas de volume do aparelho dão conta.
              className="volume-slider hidden h-1 w-0 cursor-pointer opacity-0 transition-[width,opacity] duration-200 focus-visible:w-16 focus-visible:opacity-100 group-hover/vol:w-16 group-hover/vol:opacity-100 sm:block sm:group-hover/vol:w-20"
            />
          </div>

          {/* O relógio fica na fileira, e não em uma linha própria no toque:
              aquela linha custava 17px de altura num player que no celular tem
              162px, e com ela a barra empurrava o trilho de progresso até o
              MEIO do quadro — o toque no centro do vídeo dava seek em vez de
              pausar, o gesto mais básico do player.
              `hidden min-[400px]:block` porque o espaço horizontal também é
              apertado: nos 268px de fileira que sobram num player de 288px, o
              relógio comprimia os três primeiros botões para 35px, abaixo do
              alvo mínimo de 44px. Abaixo de 400px de tela ele sai e a barra de
              progresso já indica a posição; o tempo exato continua na tela
              cheia, onde a largura sobra. */}
          <TimeReadout
            current={currentTime}
            total={duration}
            className="ml-1 hidden min-w-0 shrink truncate min-[400px]:block"
          />

          <div className="ml-auto">
            <ControlButton
              onClick={toggleFullscreen}
              label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              keyShortcut="f"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </ControlButton>
          </div>
        </div>
      </div>

      {/* Por último no DOM de propósito: dois elementos absolutos irmãos se
          empilham na ordem em que aparecem, então este círculo fica ACIMA da
          barra de controles. Era esse o bug — a barra cobria o botão e o
          toque nunca chegava nele.
          Só o círculo captura toque; o escurecimento ao redor é inerte e o
          toque ali cai no <video>, que também dá play. */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Reproduzir"
          // No celular o circulo cai para 48px e sobe para o meio do espaco
          // LIVRE (`top-[38%]`), nao o meio geometrico do player: a barra de
          // controles cresce a partir de baixo, entao com `top-1/2` e 56px o
          // circulo encostava no trilho de progresso num player de 162px
          // (celular pequeno na coluna de conteudo).
          // Porcentagem e nao um `bottom` em pixels: a altura da barra muda com
          // o conteudo (o relogio entra a partir de 400px), e um numero fixo
          // aqui ficaria defasado na primeira mudanca da barra.
          // Do `sm` para cima o player e alto o bastante e nada muda.
          className="absolute left-1/2 top-[38%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition-transform duration-200 hover:scale-105 focus-ring sm:top-1/2 sm:h-16 sm:w-16"
        >
          <Play size={22} fill="currentColor" className="ml-0.5 sm:hidden" />
          <Play size={26} fill="currentColor" className="ml-1 hidden sm:block" />
        </button>
      )}
    </div>
  )
}

/** Tempo decorrido e duração. Existe como componente porque aparece em dois
 *  lugares — na fileira de botões no ponteiro fino, e numa linha própria no
 *  toque, onde a fileira não tem largura para ele. Só um dos dois fica visível
 *  por vez (`hidden` também o tira da árvore de acessibilidade), então não há
 *  leitura duplicada. */
function TimeReadout({
  current,
  total,
  className,
}: {
  current: number
  total: number
  className?: string
}) {
  return (
    <span
      className={cn(
        'shrink-0 font-mono text-[10px] tabular-nums text-white/85 sm:text-xs',
        className,
      )}
    >
      {formatTime(current)} / {formatTime(total)}
    </span>
  )
}

/** Seta circular com o número de segundos no meio — o desenho que YouTube e
 *  Netflix usam para "voltar/avançar N". O número importa mais no toque, onde
 *  não existe `title` no hover para explicar o botão. */
function SkipIcon({ direction }: { direction: 'back' | 'forward' }) {
  const Arrow = direction === 'back' ? RotateCcw : RotateCw
  return (
    <span className="relative flex items-center justify-center">
      <Arrow size={19} />
      {/* aria-hidden: o número já está no aria-label do botão, e sozinho
          ("10") não diria nada a um leitor de tela. */}
      <span
        aria-hidden
        className="absolute font-mono text-[8px] font-bold leading-none"
      >
        {SKIP_SECONDS}
      </span>
    </span>
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
  /** Tecla de atalho equivalente. Vira `aria-keyshortcuts` e entra no `title`:
   *  os atalhos existiam (espaço/K, setas, M, F) mas nada na interface dizia
   *  que existiam. */
  keyShortcut,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  keyShortcut?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-keyshortcuts={keyShortcut}
      title={keyShortcut ? `${label} (${keyShortcut.toUpperCase()})` : label}
      // 40px não alcançava o mínimo de toque de 44px, e estes botões ficam a
      // 2px um do outro no mobile (`gap-0.5`) — errar o "silenciar" e acertar
      // "tela cheia" era fácil. Mesma regra do Button `sm`: a área cresce só no
      // toque, o desenho de 40px continua no ponteiro fino.
      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus-ring max-sm:h-11 max-sm:w-11"
    >
      {children}
    </button>
  )
}
