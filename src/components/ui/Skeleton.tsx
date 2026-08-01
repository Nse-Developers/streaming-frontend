import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />
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
