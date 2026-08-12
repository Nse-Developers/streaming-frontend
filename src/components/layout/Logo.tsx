/** O ponto usa o accent (menta), não o brand: o azul é a cor de ação em toda a
 *  interface, e repeti-lo na marca tiraria a força do que é clicável. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`font-display text-xl font-extrabold tracking-tight text-surface-900 ${className ?? ''}`}>
      Byou<span className="text-accent-ink">.</span>
    </span>
  )
}
