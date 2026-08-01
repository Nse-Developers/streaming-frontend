import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className, ...props }, ref) => {
    const inputId = id ?? props.name
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
          {...props}
        />
        {error ? (
          <p className="text-xs font-medium text-danger-400">{error}</p>
        ) : hint ? (
          <p className="text-xs text-surface-600">{hint}</p>
        ) : null}
      </div>
    )
  },
)
Input.displayName = 'Input'
