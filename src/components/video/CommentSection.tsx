import { useState } from 'react'
import { ThumbsUp, Trash2, MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/context/AuthContext'
import { useAddComment, useComments, useDeleteComment, useToggleCommentLike } from '@/hooks/useComments'
import { mockApi } from '@/mocks/api'
import { creatorById } from '@/mocks/data'
import { formatCompact, formatRelativeDate } from '@/lib/format'
import { cn } from '@/lib/cn'

export function CommentSection({ videoId }: { videoId: number }) {
  const { user, isAuthenticated } = useAuth()
  const { data: comments, isLoading } = useComments(videoId)
  const addComment = useAddComment(videoId)
  const deleteComment = useDeleteComment(videoId)
  const toggleLike = useToggleCommentLike(videoId)
  const [text, setText] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    addComment.mutate({ text: text.trim(), authorId: user?.id ?? 3 })
    setText('')
  }

  return (
    <section className="mt-10">
      <h2 className="mb-5 font-display text-lg font-bold text-surface-900">
        {comments?.length ?? 0} comentários
      </h2>

      {isAuthenticated && (
        <form onSubmit={submit} className="mb-8 flex gap-3">
          <Avatar name={user?.name ?? '?'} />
          <div className="flex-1">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Adicione um comentário..."
              className="w-full border-b border-surface-300 bg-transparent pb-2 text-sm text-surface-900 placeholder:text-surface-600 transition-colors focus:border-brand-400 focus:outline-none"
            />
            {text && (
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setText('')}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" isLoading={addComment.isPending}>
                  Comentar
                </Button>
              </div>
            )}
          </div>
        </form>
      )}

      {isLoading && (
        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (comments?.length ?? 0) === 0 && (
        <EmptyState icon={MessageSquare} title="Nenhum comentário ainda" description="Seja a primeira pessoa a comentar." />
      )}

      <div className="space-y-6">
        {comments?.map((comment) => {
          const author = creatorById(comment.authorId)
          const liked = mockApi.isCommentLiked(comment.id)
          const isOwn = comment.authorId === user?.id
          return (
            <div key={comment.id} className="flex gap-3">
              <Avatar name={author.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-surface-900">{author.name}</span>
                  <span className="text-xs text-surface-600">{formatRelativeDate(comment.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-surface-800">{comment.text}</p>
                <div className="mt-2 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => toggleLike.mutate(comment.id)}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-medium transition-colors',
                      liked ? 'text-brand-400' : 'text-surface-600 hover:text-surface-900',
                    )}
                  >
                    <ThumbsUp size={14} fill={liked ? 'currentColor' : 'none'} />
                    {formatCompact(comment.likes)}
                  </button>
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => deleteComment.mutate(comment.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-surface-600 transition-colors hover:text-danger-400"
                    >
                      <Trash2 size={14} />
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
