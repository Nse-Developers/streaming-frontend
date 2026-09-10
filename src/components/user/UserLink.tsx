import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { profilePath } from '@/lib/video'
import { VerifiedBadge, type VerifiedBadgeSize } from '@/components/user/VerifiedBadge'
import { useVerifiedById } from '@/hooks/useUsers'
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
 *  e o texto fiquem visualmente idênticos, mudando só o afford de clique.
 *
 *  O selo de verificado entra aqui, e não em cada tela, para que a regra
 *  (posição, tamanho, quando aparece) exista num lugar só — é o mesmo motivo
 *  pelo qual o link mora aqui. O estado vem de `useVerifiedById`, que devolve
 *  `undefined` na maioria dos casos porque nem o vídeo nem o comentário
 *  trazem o campo; nesse caso não se desenha nada. */
export function UserLink({
  userId,
  name,
  className,
  title,
  badgeSize = 'sm',
  verified,
}: {
  userId: number | null | undefined
  name: string
  className?: string
  title?: string
  /** Tamanho do selo. `sm` por padrão porque as duas telas que usam este
   *  componente (vídeo e comentários) mostram o nome em texto pequeno. */
  badgeSize?: VerifiedBadgeSize
  /** Valor explícito da API quando a rota já entrega o status de verificação. */
  verified?: boolean
}) {
  const path = profilePath(userId)
  const isVerified = verified ?? useVerifiedById(userId)

  const badge = <VerifiedBadge verified={isVerified} size={badgeSize} />

  // Os dois ramos abaixo viraram `inline-flex`, com o nome num <span> próprio,
  // em vez do texto solto de antes. O motivo é o `truncate` que as telas passam
  // pela className: aplicado ao nó que contém nome E selo, um nome longo
  // apagava justamente o selo. Truncando só o <span> do nome, o selo fica fora
  // do corte e continua visível.

  if (!path) {
    return (
      <span className={cn('inline-flex min-w-0 max-w-full items-center gap-1', className)}>
        <span className="min-w-0 truncate">{name}</span>
        {badge}
      </span>
    )
  }

  return (
    <Link
      to={path}
      title={title ?? `Ver o perfil de ${name}`}
      className={cn(
        // `group/name` é o gancho da animação do selo: o alvo real do ponteiro
        // é o nome, não os 14px do ícone (ver VerifiedBadge).
        'group/name inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm transition-colors hover:text-brand-link focus-ring',
        className,
      )}
    >
      {/* O sublinhado do hover fica só no NOME. No link inteiro ele passava
          por baixo do selo também, e um traço cruzando a roseta lia como
          rasura. */}
      <span className="min-w-0 truncate underline-offset-2 group-hover/name:underline">
        {name}
      </span>
      {badge}
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
