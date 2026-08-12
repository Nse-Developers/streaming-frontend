import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'brand' | 'success' | 'danger'

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-surface-200 text-surface-700',
  brand: 'bg-brand-500/15 text-brand-link',
  success: 'bg-success-500/15 text-success-400',
  danger: 'bg-danger-500/15 text-danger-400',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide', toneClasses[tone])}>
      {children}
    </span>
  )
}
