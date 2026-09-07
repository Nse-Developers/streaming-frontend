/** Esqueleto decorativo que fica atrás do AuthWall, desfocado.
 *
 *  Blocos vazios de propósito: o desfoque é reversível por qualquer pessoa que
 *  abra o DevTools, então o que está por baixo não pode ser conteúdo real. O
 *  papel dele é só dar a silhueta de uma página — formulário, grade de cards —
 *  para o aviso não flutuar sobre um retângulo em branco.
 *
 *  Sem `animate-pulse` (que o `.skeleton` do index.css traz): aqui não há nada
 *  carregando, e uma tela pulsando atrás do aviso sugere que basta esperar. */
export function AuthWallBackdrop({ variant }: { variant: 'form' | 'profile' | 'player' }) {
  const block = 'rounded-xl bg-surface-200'

  if (variant === 'player') {
    return (
      <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className={`${block} aspect-video w-full`} />
            <div className={`${block} mt-4 h-7 w-3/4`} />
            <div className={`${block} mt-3 h-4 w-2/5`} />
            <div className={`${block} mt-6 h-24 w-full`} />
          </div>
          <div className="hidden space-y-3.5 lg:block">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-2.5">
                <div className={`${block} aspect-video w-[168px] shrink-0`} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className={`${block} h-3.5 w-full`} />
                  <div className={`${block} h-3 w-2/3`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'form') {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <div className={`${block} h-8 w-2/5`} />
        <div className={`${block} mt-3 h-4 w-3/5`} />
        <div className="mt-8 space-y-5">
          <div className={`${block} h-11 w-full`} />
          <div className={`${block} h-28 w-full`} />
          <div className={`${block} h-11 w-full`} />
          <div className={`${block} h-40 w-full`} />
          <div className={`${block} h-11 w-1/3`} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 rounded-full bg-surface-200" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className={`${block} h-7 w-1/3`} />
          <div className={`${block} h-4 w-1/4`} />
        </div>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index}>
            <div className={`${block} aspect-video w-full`} />
            <div className={`${block} mt-2.5 h-4 w-4/5`} />
            <div className={`${block} mt-1.5 h-3 w-2/5`} />
          </div>
        ))}
      </div>
    </div>
  )
}
