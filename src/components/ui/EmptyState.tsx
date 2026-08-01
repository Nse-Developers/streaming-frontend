import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-300 px-6 py-16 text-center', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-200 text-surface-600">
        <Icon size={22} />
      </div>
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-surface-800">{title}</p>
        {description && <p className="max-w-sm text-sm text-surface-600">{description}</p>}
      </div>
      {action}
    </div>
  )
}
