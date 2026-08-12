import { forwardRef, useState, type InputHTMLAttributes } from 'react'
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
    const inputId = id ?? props.name

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
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            // tabIndex -1: não interromper o fluxo de Tab entre os campos.
            tabIndex={-1}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-surface-600 transition-colors hover:bg-surface-200 hover:text-surface-800 focus-ring"
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error ? (
          <p className="text-xs font-medium text-danger-400">{error}</p>
        ) : hint ? (
          <p className="text-xs text-surface-600">{hint}</p>
        ) : null}
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'
