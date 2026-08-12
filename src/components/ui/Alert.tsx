import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/cn'

type Tone = 'error' | 'warning' | 'info' | 'success'

const TONES: Record<Tone, { icon: typeof Info; classes: string; iconClass: string }> = {
  error: {
    icon: AlertTriangle,
    classes: 'border-danger-500/30 bg-danger-500/8',
    iconClass: 'text-danger-400',
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
    iconClass: 'text-success-400',
  },
}

/** Aviso inline. `role=alert` para erros, para o leitor de tela anunciar na hora. */
export function Alert({
  tone = 'error',
  title,
  children,
  className,
}: {
  tone?: Tone
  title?: string
  children?: React.ReactNode
  className?: string
}) {
  const { icon: Icon, classes, iconClass } = TONES[tone]

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3', classes, className)}
    >
      <Icon size={17} className={cn('mt-0.5 shrink-0', iconClass)} />
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-surface-900">{title}</p>}
        {children && <div className={cn('text-surface-700', title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  )
}
