import { useState } from 'react'
import { Star, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { toErrorMessage } from '@/api/client'
import {
  useGiveFeedback,
  useMyVideoFeedback,
  useRemoveFeedback,
  useVideoRating,
} from '@/hooks/useFeedback'
import type { FeedbackReactionType } from '@/api/types'
import { cn } from '@/lib/cn'

const STARS = [1, 2, 3, 4, 5] as const

/** Avaliação de um vídeo: média da plataforma + a nota do próprio usuário.
 *
 *  O backend aceita UMA avaliação por usuário por vídeo (a segunda responde
 *  409) e não expõe update. Por isso a tela tem dois estados distintos, e não
 *  um formulário sempre editável:
 *
 *   - sem avaliação -> escolher nota (1..5) + reação opcional e enviar;
 *   - já avaliado    -> mostra a própria nota e oferece REMOVER, que é o único
 *                       caminho para depois avaliar de novo.
 *
 *  Enquanto `useMyVideoFeedback` carrega, nada é oferecido: mostrar o
 *  formulário antes de saber se já existe nota levaria o usuário direto ao 409.
 */
export function RatingSection({ videoId }: { videoId: number }) {
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()

  const { average, total, likes, dislikes, isLoading: loadingRating } = useVideoRating(videoId)
  const { feedback: mine, isLoading: loadingMine } = useMyVideoFeedback(videoId)

  const give = useGiveFeedback(videoId)
  const remove = useRemoveFeedback(videoId)

  const [rating, setRating] = useState(0)
  const [reaction, setReaction] = useState<FeedbackReactionType | null>(null)

  const submit = async () => {
    // O botão já fica desabilitado sem nota; isto evita chegar ao 400 do
    // backend caso o estado mude por outro caminho.
    if (rating < 1) return
    try {
      await give.mutateAsync({ rating, feedbackReactionType: reaction })
      showToast('Avaliação enviada.', 'success')
      setRating(0)
      setReaction(null)
    } catch (error) {
      showToast(toErrorMessage(error), 'error')
    }
  }

  const undo = async () => {
    try {
      await remove.mutateAsync()
      showToast('Avaliação removida.', 'success')
    } catch (error) {
      showToast(toErrorMessage(error), 'error')
    }
  }

  return (
    <section
      aria-labelledby={`rating-heading-${videoId}`}
      className="mt-4 rounded-xl border border-surface-200 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id={`rating-heading-${videoId}`}
          className="font-display text-sm font-bold text-surface-900"
        >
          Avaliações
        </h2>

        {loadingRating ? (
          <Skeleton className="h-5 w-28" />
        ) : total === 0 ? (
          <p className="text-sm text-surface-600">Nenhuma avaliação ainda.</p>
        ) : (
          // Um só `aria-label` para o bloco todo: sem ele, o leitor de tela
          // anunciaria "4,3 (12) 8 1" — números sem significado, já que o que
          // os distingue são os ícones, que são decorativos.
          <p
            className="flex items-center gap-3 text-sm text-surface-700"
            aria-label={`Nota média ${average!.toFixed(1)} de 5, ${total} ${
              total === 1 ? 'avaliação' : 'avaliações'
            }.`}
          >
            <span className="flex items-center gap-1 font-semibold tabular-nums text-surface-900">
              <Star size={15} className="fill-star-ink text-star-ink" aria-hidden="true" />
              {average!.toFixed(1)}
            </span>
            <span className="tabular-nums text-surface-600" aria-hidden="true">
              ({total})
            </span>
            {(likes > 0 || dislikes > 0) && (
              <span className="flex items-center gap-2 text-surface-600" aria-hidden="true">
                <span className="flex items-center gap-1 tabular-nums">
                  <ThumbsUp size={14} /> {likes}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <ThumbsDown size={14} /> {dislikes}
                </span>
              </span>
            )}
          </p>
        )}
      </div>

      {!isAuthenticated ? null : loadingMine ? (
        <Skeleton className="mt-4 h-11 w-full" />
      ) : mine ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 pt-4">
          <p className="flex items-center gap-2 text-sm text-surface-700">
            <span>Sua nota:</span>
            <span
              className="flex items-center gap-0.5"
              aria-label={`Você avaliou com ${mine.rating} de 5.`}
            >
              {STARS.map((star) => (
                <Star
                  key={star}
                  size={16}
                  aria-hidden="true"
                  className={cn(
                    star <= mine.rating ? 'fill-star-ink text-star-ink' : 'text-surface-400',
                  )}
                />
              ))}
            </span>
            {mine.feedbackReactionType === 'LIKE' && (
              <ThumbsUp size={14} className="text-surface-600" aria-label="Você curtiu." />
            )}
            {mine.feedbackReactionType === 'DISLIKE' && (
              <ThumbsDown size={14} className="text-surface-600" aria-label="Você não curtiu." />
            )}
          </p>

          {/* Remover é o único caminho para trocar de nota: não existe update no
              backend, e a segunda avaliação recebe 409. */}
          <Button variant="ghost" size="sm" onClick={undo} isLoading={remove.isPending}>
            <Trash2 size={15} aria-hidden="true" />
            Remover avaliação
          </Button>
        </div>
      ) : (
        <div className="mt-4 border-t border-surface-200 pt-4">
          {/* radiogroup, e não cinco botões soltos: a nota é uma escolha ÚNICA
              entre cinco. É o que faz o leitor de tela anunciar "2 de 5" e as
              setas andarem entre as opções, como num input type=radio. */}
          <div
            role="radiogroup"
            aria-label="Sua nota para este vídeo, de 1 a 5"
            className="flex items-center gap-1"
          >
            {STARS.map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
                onClick={() => setRating(star)}
                // Só a opção marcada entra na ordem de tabulação (a primeira,
                // quando nada está marcado): um radiogroup é UMA parada de Tab,
                // não cinco. As setas fazem a navegação interna.
                tabIndex={rating === star || (rating === 0 && star === 1) ? 0 : -1}
                onKeyDown={(event) => {
                  const delta =
                    event.key === 'ArrowRight' || event.key === 'ArrowDown'
                      ? 1
                      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                        ? -1
                        : 0
                  if (delta === 0) return
                  event.preventDefault()
                  // Circular entre 1 e 5, como o radiogroup nativo.
                  const next = ((rating || 1) - 1 + delta + 5) % 5
                  setRating(next + 1)
                  const group = event.currentTarget.parentElement
                  group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
                }}
                className="focus-ring rounded-md p-1.5 transition hover:opacity-80 max-sm:min-h-[44px] max-sm:min-w-[44px]"
              >
                <Star
                  size={22}
                  aria-hidden="true"
                  className={cn(
                    star <= rating ? 'fill-star-ink text-star-ink' : 'text-surface-400',
                  )}
                />
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* A reação COMPLEMENTA a nota (o backend aceita ausente/null), não
                a substitui. Clicar de novo desmarca. */}
            <Button
              variant={reaction === 'LIKE' ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={reaction === 'LIKE'}
              onClick={() => setReaction((prev) => (prev === 'LIKE' ? null : 'LIKE'))}
            >
              <ThumbsUp size={15} aria-hidden="true" />
              Gostei
            </Button>
            <Button
              variant={reaction === 'DISLIKE' ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={reaction === 'DISLIKE'}
              onClick={() => setReaction((prev) => (prev === 'DISLIKE' ? null : 'DISLIKE'))}
            >
              <ThumbsDown size={15} aria-hidden="true" />
              Não gostei
            </Button>

            <Button
              size="sm"
              className="ml-auto"
              onClick={submit}
              disabled={rating < 1}
              isLoading={give.isPending}
            >
              Enviar avaliação
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
