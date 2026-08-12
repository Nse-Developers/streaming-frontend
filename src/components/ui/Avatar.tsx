import { cn } from '@/lib/cn'

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-brand-500/20 font-display font-semibold text-brand-link',
        className ?? 'h-9 w-9 text-sm',
      )}
    >
      {initials(name || '?') || '?'}
    </div>
  )
}
