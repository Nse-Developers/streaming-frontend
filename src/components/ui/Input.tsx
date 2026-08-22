import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? props.name ?? generatedId
    /** `aria-describedby` liga a mensagem ao campo. Sem ele o leitor de tela
     *  anunciava "inválido" e nunca o motivo: o texto do erro ficava como
     *  parágrafo solto, alcançável só saindo do modo de formulário. */
    const msgId = `${inputId}-msg`
    const describedBy = error || hint ? msgId : undefined
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-surface-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 min-h-[44px] w-full rounded-lg border bg-surface-100 px-3.5 text-[15px] text-surface-900 placeholder:text-surface-600 transition-colors duration-150 focus-ring',
            error ? 'border-danger-500/60' : 'border-surface-300 hover:border-surface-400 focus:border-brand-400',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
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
Input.displayName = 'Input'
