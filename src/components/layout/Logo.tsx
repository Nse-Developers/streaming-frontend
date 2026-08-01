export function Logo({ className }: { className?: string }) {
  return (
    <span className={`font-display text-xl font-extrabold tracking-tight text-surface-900 ${className ?? ''}`}>
      vero<span className="text-brand-500">.</span>
    </span>
  )
}
