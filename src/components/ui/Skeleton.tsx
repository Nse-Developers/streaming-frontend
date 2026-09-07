import { cn } from '@/lib/cn'

/** Placeholder de carregamento.
 *
 *  `aria-hidden` porque é puramente visual: sem isto, quem usa leitor de tela
 *  encontrava caixas vazias no percurso do documento e nada explicando que a
 *  página está carregando. Quem anuncia o carregamento é o container — ver
 *  `LoadingRegion` abaixo, e o mesmo padrão em RouteGuards. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-md', className)} />
}

/** Envolve um bloco de skeletons e anuncia o carregamento uma única vez. */
export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-video w-full rounded-lg" />
      <div className="flex gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 py-0.5">
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-3 w-[55%]" />
          <Skeleton className="h-3 w-[40%]" />
        </div>
      </div>
    </div>
  )
}
