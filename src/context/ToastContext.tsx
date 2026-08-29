import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const variantStyles: Record<ToastVariant, { icon: typeof CheckCircle2; classes: string }> = {
  success: { icon: CheckCircle2, classes: 'border-success-500/30 text-success-ink' },
  error: { icon: XCircle, classes: 'border-danger-500/30 text-danger-ink' },
  info: { icon: Info, classes: 'border-surface-400/40 text-surface-700' },
}

/** Tempo na tela, proporcional ao tamanho da mensagem.
 *
 *  Eram 5s fixos para tudo, mas os toasts carregam mensagem de erro do
 *  servidor, de comprimento arbitrário — uma frase longa sumia antes de ser
 *  lida. Base de 5s mais ~50ms por caractere, com teto de 12s. */
function readingTime(message: string): number {
  return Math.min(12_000, 5_000 + message.length * 50)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = ++counterRef.current
      setToasts((prev) => [...prev, { id, message, variant }])
      timers.current.set(id, setTimeout(() => dismiss(id), readingTime(message)))
    },
    [dismiss],
  )

  /** Pausa a contagem enquanto o cursor está sobre o toast ou o foco está
   *  dentro dele: sem isto, tabular até "Fechar notificação" podia fazer o
   *  toast desaparecer sob o próprio foco, deixando-o órfão. */
  const hold = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const resume = useCallback(
    (id: number, message: string) => {
      if (timers.current.has(id)) return
      timers.current.set(id, setTimeout(() => dismiss(id), readingTime(message)))
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  /** As duas regiões ficavam em `bottom-0`, a mesma borda que a BottomNav fixa
   *  ocupa no mobile — o toast nascia ATRÁS da barra de navegação (z-100 contra
   *  z-40 só resolve a pilha, não a sobreposição: o texto ficava coberto).
   *  Abaixo de `lg` o piso sobe a altura da barra (56px) mais a faixa de gestos
   *  do aparelho; a partir de `lg` a BottomNav some e o toast volta ao rodapé.
   *  `bottom-0` continua na classe porque `lg:bottom-0` precisa de algo para
   *  sobrescrever. */
  const viewportClass =
    'pointer-events-none fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[100] flex flex-col items-center gap-2 p-4 lg:bottom-0 sm:items-end sm:p-6'


  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* As duas regiões vivas ficam SEMPRE no DOM, vazias quando não há
          toast. Uma live region que nasce junto com o texto dentro dela é
          anunciada de forma inconsistente (NVDA/VoiceOver): o leitor precisa
          já estar observando a região quando o conteúdo muda.
          Erro vai na `assertive` — antes tudo era role="status" (polite), e um
          erro esperava o leitor terminar a fala corrente, podendo desaparecer
          antes de ser anunciado. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className={viewportClass}
      >
        {toasts
          .filter((toast) => toast.variant !== 'error')
          .map((toast) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              onDismiss={dismiss}
              onHold={hold}
              onResume={resume}
            />
          ))}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        className={viewportClass}
      >
        {toasts
          .filter((toast) => toast.variant === 'error')
          .map((toast) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              onDismiss={dismiss}
              onHold={hold}
              onResume={resume}
            />
          ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({
  toast,
  onDismiss,
  onHold,
  onResume,
}: {
  toast: Toast
  onDismiss: (id: number) => void
  onHold: (id: number) => void
  onResume: (id: number, message: string) => void
}) {
  const { icon: Icon, classes } = variantStyles[toast.variant]
  return (
    <div
      onMouseEnter={() => onHold(toast.id)}
      onMouseLeave={() => onResume(toast.id, toast.message)}
      onFocus={() => onHold(toast.id)}
      onBlur={() => onResume(toast.id, toast.message)}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface-100 px-4 py-3 shadow-elevated animate-[toast-in_200ms_ease-out] ${classes}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-surface-800">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-m-1 shrink-0 rounded p-2 text-surface-600 hover:text-surface-800 focus-ring"
        aria-label="Fechar notificação"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
