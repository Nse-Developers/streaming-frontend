import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const areaId = id ?? props.name
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={areaId} className="text-sm font-medium text-surface-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          className={cn(
            'min-h-[96px] w-full resize-y rounded-lg border bg-surface-100 px-3.5 py-2.5 text-[15px] text-surface-900 placeholder:text-surface-600 transition-colors duration-150 focus-ring',
            error ? 'border-danger-500/60' : 'border-surface-300 hover:border-surface-400 focus:border-brand-400',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error && <p className="text-xs font-medium text-danger-400">{error}</p>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
