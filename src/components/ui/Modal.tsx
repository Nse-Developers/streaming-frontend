import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** Tudo que pode receber foco dentro do painel. `:not([disabled])` importa
 *  porque o botão de confirmar fica desabilitado enquanto a ação roda — e um
 *  alvo desabilitado no ciclo do Tab prenderia o foco num elemento inerte. */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    // Quem abriu o diálogo. O foco volta para cá no fechamento: sem isto ele
    // cai no <body> e quem navega por teclado perde o lugar na página.
    const opener = document.activeElement as HTMLElement | null

    const focusables = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

    // O foco entra no painel na abertura — é o que faz o leitor de tela
    // anunciar o diálogo (sem isso o foco fica no botão que ficou atrás do
    // overlay, e nada é anunciado).
    //
    // Prioridade para o que NÃO é destrutivo: estes diálogos confirmam
    // exclusão, e deixar "Excluir" sob o foco convida um Enter distraído a
    // apagar dados. Um campo de formulário, quando existe, e o botão de
    // fechar como ultimo recurso.
    const items = focusables()
    const field = items.find((el) => el.matches('input, textarea, select'))
    const cancel = items.find((el) => /cancelar/i.test(el.textContent ?? ''))
    ;(field ?? cancel ?? items[0] ?? panelRef.current)?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      // Ciclo fechado: sem isto o Tab sai do diálogo e passeia pelo conteúdo
      // atrás do overlay, que está visualmente coberto mas continua focável.
      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      // `focus` só se o elemento ainda existe no documento: o opener pode ter
      // sido desmontado pela própria ação (ex.: excluir a linha que abriu o
      // diálogo), e aí focar um nó órfão não faz nada.
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    // `overflow-y-auto` + `items-start sm:items-center`: um painel mais alto que
    // a tela precisa rolar. Centralizado e sem scroll, o conteúdo que passa da
    // viewport ficava fisicamente fora dela — e como o scroll do body está
    // travado, os botões de ação viravam inalcançáveis (o caso real era o
    // formulário de categoria em celular na horizontal).
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        className="fixed inset-0 bg-black/70 animate-[toast-in_150ms_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        // dvh e não vh: no Safari iOS a barra de endereço come ~60px da vh, e o
        // corte que o max-h deveria evitar volta a acontecer.
        className="relative z-10 my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-xl border border-surface-300 bg-surface-100 p-5 shadow-elevated focus:outline-none"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          {title && <h2 className="font-display text-lg font-semibold text-surface-900">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="-m-1 ml-auto rounded-md p-2 text-surface-600 hover:bg-surface-200 hover:text-surface-900 focus-ring"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        {/* min-h-0 é o que permite ao filho encolher dentro do flex e ativar o
            próprio scroll; sem ele o painel cresce e estoura o max-h. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
