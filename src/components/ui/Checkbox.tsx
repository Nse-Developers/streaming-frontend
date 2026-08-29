import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** ReactNode e não string: o rótulo do aceite carrega links para os
   *  documentos, e eles precisam ser clicáveis dentro da própria frase. */
  label: ReactNode
  error?: string
  hint?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? props.name ?? generatedId
    const msgId = `${inputId}-msg`
    const describedBy = error || hint ? msgId : undefined

    return (
      <div className="flex flex-col gap-1.5">
        {/* O <label> NÃO envolve a caixa e o texto juntos: com links dentro do
            rótulo, clicar num link também alternaria o checkbox. Ficam lado a
            lado, ligados por htmlFor — o clique no texto marca, o clique no
            link abre o documento. */}
        <div className="flex items-start gap-2.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn(
              // h-5/w-5 com margem de toque: a caixa nativa tem ~13px e fica
              // abaixo do alvo mínimo confortável no celular.
              'mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border bg-surface-100 accent-brand-500 transition-colors duration-150 focus-ring',
              error ? 'border-danger-500/60' : 'border-surface-400',
              className,
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            {...props}
          />
          <label
            htmlFor={inputId}
            className="cursor-pointer text-sm leading-snug text-surface-800"
          >
            {label}
          </label>
        </div>
        {error ? (
          <p id={msgId} className="text-xs font-medium text-danger-ink">
            {error}
          </p>
        ) : hint ? (
          <p id={msgId} className="text-xs text-surface-600">
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)
Checkbox.displayName = 'Checkbox'
