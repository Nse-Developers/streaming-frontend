import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ThumbsUp, MessageSquare, ServerCrash } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { UserLink, UserAvatarLink } from '@/components/user/UserLink'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { useAddComment, useComments, useToggleCommentLike } from '@/hooks/useComments'
import { useToast } from '@/context/ToastContext'
import { toErrorMessage } from '@/api/client'
import { commentSchema, type CommentValues } from '@/lib/validation'
import { formatCompact, formatRelativeDate } from '@/lib/format'
import { cn } from '@/lib/cn'

export function CommentSection({ videoId }: { videoId: number }) {
  const { user, isAuthenticated } = useAuth()
  const { data: comments, isLoading, isError, error } = useComments(videoId)
  const addComment = useAddComment(videoId)
  const toggleLike = useToggleCommentLike(videoId)
  const { showToast } = useToast()

  // A API não informa "eu curti este comentário?", então a curtida é local à
  // sessão: some no F5, mas o contador exibido vem sempre do servidor.
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set())

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { text: '' },
  })

  const text = watch('text') ?? ''

  const onSubmit = async (values: CommentValues) => {
    try {
      await addComment.mutateAsync(values.text)
      reset({ text: '' })
    } catch (err) {
      showToast(toErrorMessage(err), 'error')
    }
  }

  const onToggleLike = async (commentId: number) => {
    const liked = likedIds.has(commentId)
    // Atualiza otimista: a curtida tem que responder na hora.
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (liked) next.delete(commentId)
      else next.add(commentId)
      return next
    })
    try {
      await toggleLike.mutateAsync({ commentId, liked })
    } catch (err) {
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (liked) next.add(commentId)
        else next.delete(commentId)
        return next
      })
      showToast(toErrorMessage(err), 'error')
    }
  }

  return (
    <section className="mt-10">
      <h2 className="mb-5 font-display text-lg font-bold text-surface-900">
        {comments?.length ?? 0} {comments?.length === 1 ? 'comentário' : 'comentários'}
      </h2>

      {isAuthenticated && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mb-8 flex gap-3">
          <Avatar name={user?.name ?? '?'} />
          <div className="min-w-0 flex-1">
            {/* <textarea> e não <input>: o comentário é renderizado abaixo com
                `whitespace-pre-wrap`, ou seja, quebras de linha são exibidas —
                mas um <input> não permite digitá-las. Somado ao limite de 1000
                caracteres, escrever um texto longo significava rolar
                horizontalmente por uma linha de ~28px de altura.
                `rows=2` também resolve o alvo de toque, que estava abaixo dos
                44px mínimos. Enter envia (como antes); Shift+Enter quebra a
                linha, que é a convenção de caixa de comentário. */}
            <textarea
              {...register('text')}
              rows={2}
              placeholder="Adicione um comentário…"
              aria-label="Novo comentário"
              maxLength={1000}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void handleSubmit(onSubmit)()
                }
              }}
              className="w-full resize-y border-b border-surface-300 bg-transparent pb-2 text-sm leading-relaxed text-surface-900 placeholder:text-surface-600 transition-colors focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
            />
            {errors.text && (
              <p className="mt-1.5 text-xs font-medium text-danger-ink">{errors.text.message}</p>
            )}
            {text.trim().length > 0 && (
              <div className="mt-3 flex items-center justify-end gap-2">
                <span
                  className="mr-auto text-xs tabular-nums text-surface-600"
                  // O contador só aparece depois de digitar, então avisa o teto
                  // enquanto ainda há folga — e vira alerta perto do limite, em
                  // vez de o texto simplesmente parar de entrar.
                  aria-live="polite"
                >
                  <span className={text.length > 900 ? 'font-semibold text-danger-ink' : undefined}>
                    {text.length}
                  </span>
                  /1000
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => reset({ text: '' })}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" isLoading={isSubmitting}>
                  Comentar
                </Button>
              </div>
            )}
          </div>
        </form>
      )}

      {isLoading && (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-[80%]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <Alert tone="error">
          <span className="inline-flex items-center gap-2">
            <ServerCrash size={15} />
            {toErrorMessage(error)}
          </span>
        </Alert>
      )}

      {!isLoading && !isError && comments?.length === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="Nenhum comentário ainda"
          description={
            isAuthenticated ? 'Seja o primeiro a comentar.' : 'Entre para participar da conversa.'
          }
        />
      )}

      {!isLoading && !isError && comments && comments.length > 0 && (
        <ul className="space-y-6">
          {comments.map((comment) => {
            const liked = likedIds.has(comment.commentId)
            // O backend manda nome e sobrenome separados; o join descarta o que
            // vier vazio para não sobrar espaço solto nas iniciais do avatar.
            const authorName = [comment.nameUser, comment.surnameUser]
              .filter(Boolean)
              .join(' ')
              .trim()
            return (
              <li key={comment.commentId} className="flex gap-3">
                <UserAvatarLink userId={comment.userId} name={authorName}>
                  <Avatar name={authorName || '?'} />
                </UserAvatarLink>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-surface-600">
                    {authorName && (
                      <UserLink
                        userId={comment.userId}
                        name={authorName}
                        className="font-medium text-surface-900"
                        verified={comment.userIsVerified}
                      />
                    )}
                    <span>{formatRelativeDate(comment.dataComment) || 'agora'}</span>
                  </p>
                  {/* Texto sempre como conteúdo, nunca HTML: React escapa por padrão. */}
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-surface-800">
                    {comment.text}
                  </p>
                  <button
                    type="button"
                    disabled={!isAuthenticated}
                    // Deslogado, o botão só ficava cinza e inerte, sem dizer
                    // por quê. O `title` explica no ponteiro; o `aria-label`
                    // leva o mesmo motivo a quem usa leitor de tela, já que um
                    // botão desabilitado não é alcançável pela navegação.

                    title={isAuthenticated ? undefined : 'Entre para curtir'}
                    aria-label={isAuthenticated ? undefined : 'Curtir — entre na sua conta'}
                    onClick={() => onToggleLike(comment.commentId)}
                    className={cn(
                      // p-2 -m-1 amplia a área de toque de ~26px para ~40px sem
                      // deslocar nada no layout — e no toque o mínimo de 44px
                      // fecha os 4px que ainda faltavam.
                      'mt-2 -m-1 inline-flex items-center gap-1.5 rounded-md p-2 text-xs font-medium transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-[44px] max-sm:min-w-[44px] max-sm:justify-center',
                      liked
                        ? 'text-brand-link'
                        : 'text-surface-600 hover:bg-surface-200 hover:text-surface-800',
                    )}
                    aria-pressed={liked}
                  >
                    <ThumbsUp size={13} fill={liked ? 'currentColor' : 'none'} />
                    {formatCompact(comment.likes ?? 0)}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
