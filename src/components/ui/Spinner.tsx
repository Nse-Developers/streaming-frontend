import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Indicador de carregamento puramente visual.
 *
 *  `aria-hidden` no próprio componente: quem anuncia o estado é sempre o
 *  contexto (o `aria-busy` do Button, o `role="status"` do GuardShell e do
 *  LoadingRegion), então o ícone girando não deve ser lido em nenhum uso. */
export function Spinner({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <Loader2 size={size} aria-hidden="true" className={cn('animate-spin text-brand-link', className)} />
  )
}
