import { useFollowers } from '@/hooks/useFollow'
import { formatCompact } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Contador de seguidores de um usuário.
 *
 *  Enquanto carrega não mostra nada (nem "0", nem esqueleto): é um dado
 *  secundário, e piscar "0 seguidores" antes do número real passaria uma
 *  informação errada por um instante. Erro também some — a página não vale
 *  menos por não saber o número de seguidores.
 *
 *  `inline` serve ao caso da página do vídeo, onde o número entra na mesma
 *  linha de "Criador" com um separador; sem ele vira um bloco próprio, como
 *  no cabeçalho do perfil.
 */
export function FollowerCount({
  userId,
  inline = false,
  className,
}: {
  userId: number
  inline?: boolean
  className?: string
}) {
  const { data, isSuccess } = useFollowers(userId)

  if (!isSuccess || data == null) return null

  const label = `${formatCompact(data)} ${data === 1 ? 'seguidor' : 'seguidores'}`

  if (inline) {
    return (
      <>
        <span aria-hidden="true"> · </span>
        <span className={cn('tabular-nums', className)}>{label}</span>
      </>
    )
  }

  return <span className={cn('tabular-nums', className)}>{label}</span>
}
