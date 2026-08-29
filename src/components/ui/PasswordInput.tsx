import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  hint?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    const generatedId = useId()
    const inputId = id ?? props.name ?? generatedId
    // Liga a mensagem de erro ao campo — ver comentário em Input.tsx.
    const msgId = `${inputId}-msg`

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-surface-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            className={cn(
              'h-11 min-h-[44px] w-full rounded-lg border bg-surface-100 px-3.5 pr-11 text-[15px] text-surface-900 placeholder:text-surface-600 transition-colors duration-150 focus-ring',
              error
                ? 'border-danger-500/60'
                : 'border-surface-300 hover:border-surface-400 focus:border-brand-400',
              className,
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error || hint ? msgId : undefined}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            // Sem tabIndex -1: ele mantinha o botão fora do Tab "para não
            // interromper o fluxo entre os campos", mas o efeito era tornar o
            // recurso exclusivo de quem usa mouse — quem navega por teclado
            // não conseguia revelar a senha. Uma parada a mais no Tab custa
            // menos que um recurso inacessível.
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-surface-600 transition-colors hover:bg-surface-200 hover:text-surface-800 focus-ring"
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
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
PasswordInput.displayName = 'PasswordInput'
