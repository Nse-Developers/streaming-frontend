import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** Nível do título. O padrão `h2` serve para um estado vazio DENTRO de uma
   *  página que já tem h1; use `h1` quando o EmptyState é o conteúdo inteiro
   *  da tela (erro de carregamento, 403, nada encontrado), senão a página fica
   *  sem heading nenhum e quem navega por headings não acha onde está. */
  headingLevel?: 'h1' | 'h2' | 'p'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  headingLevel: Heading = 'h2',
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-300 px-6 py-16 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-200 text-surface-600">
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <Heading className="font-display text-base font-semibold text-surface-800">{title}</Heading>
        {description && <p className="max-w-sm text-sm text-surface-600">{description}</p>}
      </div>
      {action}
    </div>
  )
}
