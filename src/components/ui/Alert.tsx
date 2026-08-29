import { useEffect, useRef } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tone = 'error' | 'warning' | 'info' | 'success'

const TONES: Record<Tone, { icon: typeof Info; classes: string; iconClass: string }> = {
  error: {
    icon: AlertTriangle,
    classes: 'border-danger-500/30 bg-danger-500/8',
    iconClass: 'text-danger-ink',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-brand-500/30 bg-brand-500/8',
    iconClass: 'text-brand-link',
  },
  info: { icon: Info, classes: 'border-surface-300 bg-surface-100', iconClass: 'text-surface-600' },
  success: {
    icon: CheckCircle2,
    classes: 'border-success-500/30 bg-success-500/8',
    iconClass: 'text-success-ink',
  },
}

/** Aviso inline. `role=alert` para erros, para o leitor de tela anunciar na hora.
 *
 *  Com `focusOnMount`, o erro move o FOCO para si ao aparecer. O `role="alert"`
 *  sozinho não bastava: o elemento é montado no instante em que o erro surge, e
 *  uma live region que nasce já com o texto dentro é anunciada de forma
 *  inconsistente. Sem isso, depois de um login falho nada mudava — o foco
 *  ficava no botão "Entrar" e a mensagem no topo do cartão nunca era lida.
 *  Mover o foco também traz o erro para a área visível, o que resolve o
 *  formulário longo em que ele fica fora da tela.
 *
 *  É opt-in porque roubar o foco nem sempre é certo: dentro de um Modal ele
 *  tiraria o foco do campo que o diálogo acabou de focar, e num erro de
 *  carregamento (que não veio de uma ação do usuário) o salto seria
 *  inesperado. */
export function Alert({
  tone = 'error',
  title,
  children,
  className,
  focusOnMount = false,
}: {
  tone?: Tone
  title?: string
  children?: React.ReactNode
  className?: string
  focusOnMount?: boolean
}) {
  const { icon: Icon, classes, iconClass } = TONES[tone]
  const ref = useRef<HTMLDivElement>(null)
  const isError = tone === 'error'
  const takesFocus = isError && focusOnMount

  useEffect(() => {
    if (takesFocus) ref.current?.focus()
  }, [takesFocus])

  return (
    <div
      ref={ref}
      role={isError ? 'alert' : 'status'}
      // tabIndex -1: recebe foco por script, mas não entra na ordem do Tab.
      tabIndex={takesFocus ? -1 : undefined}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 focus:outline-none',
        classes,
        className,
      )}
    >
      <Icon size={17} className={cn('mt-0.5 shrink-0', iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-surface-900">{title}</p>}
        {children && <div className={cn('text-surface-700', title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  )
}
