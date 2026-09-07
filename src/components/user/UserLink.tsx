import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { profilePath } from '@/lib/video'
import { cn } from '@/lib/cn'

/** Nome de um usuário, clicável quando dá para abrir o perfil dele.
 *
 *  Existe para que a mesma regra valha na página do vídeo e nos comentários:
 *  COM id, o nome vira link para /users/{id}; SEM id, fica texto simples.
 *
 *  O fallback para texto não é detalhe de estilo — é o comportamento correto
 *  enquanto o backend não devolve o id do autor junto do vídeo/comentário.
 *  Renderizar um link sem destino válido daria 404 ao clique, e tentar
 *  descobrir o id pelo nome levaria ao perfil de um homônimo. Melhor não
 *  prometer um clique que não funciona.
 *
 *  `className` recebe os estilos do texto (tamanho, peso, cor) para que o link
 *  e o texto fiquem visualmente idênticos, mudando só o afford de clique. */
export function UserLink({
  userId,
  name,
  className,
  title,
}: {
  userId: number | null | undefined
  name: string
  className?: string
  title?: string
}) {
  const path = profilePath(userId)

  if (!path) {
    return <span className={className}>{name}</span>
  }

  return (
    <Link
      to={path}
      title={title ?? `Ver o perfil de ${name}`}
      className={cn(
        'rounded-sm transition-colors hover:text-brand-link hover:underline underline-offset-2 focus-ring',
        className,
      )}
    >
      {name}
    </Link>
  )
}

/** Envolve o avatar no mesmo link do nome, quando há perfil para abrir.
 *
 *  A foto ao lado do nome é o alvo de clique que as pessoas tentam primeiro,
 *  então deixá-la inerte enquanto o nome navega passaria por bug. Sem id,
 *  devolve o avatar cru — nada de link morto.
 *
 *  `aria-hidden` no link: para leitores de tela ele seria um segundo link com
 *  o mesmo destino e sem texto próprio, ou seja, ruído. O nome ao lado já
 *  anuncia o destino, e `tabIndex={-1}` tira a parada extra do Tab. */
export function UserAvatarLink({
  userId,
  name,
  children,
}: {
  userId: number | null | undefined
  name: string
  children: ReactNode
}) {
  const path = profilePath(userId)

  if (!path) return <>{children}</>

  return (
    <Link
      to={path}
      aria-hidden="true"
      tabIndex={-1}
      title={`Ver o perfil de ${name}`}
      className="shrink-0 rounded-full transition-opacity hover:opacity-80 focus-ring"
    >
      {children}
    </Link>
  )
}
