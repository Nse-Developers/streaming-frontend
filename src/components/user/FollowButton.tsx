import { UserPlus, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useFollowing, useToggleFollow } from '@/hooks/useFollow'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { toErrorMessage } from '@/api/client'
import { cn } from '@/lib/cn'

interface FollowButtonProps {
  /** Quem será seguido. */
  userId: number
  /** Nome, só para as mensagens. */
  name?: string
  size?: 'sm' | 'md'
  className?: string
}

/** Botão Seguir / Seguindo.
 *
 *  O estado vem da lista de quem o usuário segue (GET no backend), não de
 *  memória local: assim ele está certo já no primeiro render, sobrevive ao F5
 *  e reflete o que foi feito em outro dispositivo.
 *
 *  Some por completo no próprio perfil. O backend também barra (400 "the user
 *  cannot follow themselves"), mas oferecer um botão que só serve para dar erro
 *  seria pior do que não mostrar nada. */
export function FollowButton({ userId, name, size = 'md', className }: FollowButtonProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data: following, isLoading } = useFollowing()
  const toggle = useToggleFollow(userId)

  const me = user?.id
  if (me == null || me === userId) return null

  const isFollowing = (following ?? []).includes(userId)

  const onClick = async () => {
    try {
      await toggle.mutateAsync({ following: isFollowing })
      showToast(
        isFollowing
          ? `Você deixou de seguir ${name ?? 'este usuário'}.`
          : `Você está seguindo ${name ?? 'este usuário'}.`,
        'success',
      )
    } catch (error) {
      showToast(toErrorMessage(error), 'error')
    }
  }

  return (
    <Button
      type="button"
      // Seguindo vira secundário: já é o estado desejado, não precisa competir
      // por atenção com o resto da página.
      variant={isFollowing ? 'secondary' : 'primary'}
      size={size}
      onClick={onClick}
      // Enquanto a lista não chegou, não dá para saber o rótulo correto —
      // deixar clicável mostraria "Seguir" para quem já segue e o clique
      // falharia com 400.
      disabled={isLoading}
      isLoading={toggle.isPending}
      aria-pressed={isFollowing}
      className={cn('min-w-[104px]', className)}
    >
      {isFollowing ? (
        <>
          <UserCheck size={size === 'sm' ? 14 : 16} />
          Seguindo
        </>
      ) : (
        <>
          <UserPlus size={size === 'sm' ? 14 : 16} />
          Seguir
        </>
      )}
    </Button>
  )
}
