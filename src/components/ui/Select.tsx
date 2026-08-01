import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className, children, ...props }, ref) => {
    const selectId = id ?? props.name
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-surface-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'h-11 min-h-[44px] w-full appearance-none rounded-lg border bg-surface-100 px-3.5 pr-9 text-[15px] text-surface-900 transition-colors duration-150 focus-ring',
              error ? 'border-danger-500/60' : 'border-surface-300 hover:border-surface-400 focus:border-brand-400',
              className,
            )}
            aria-invalid={Boolean(error)}
            {...props}
          >
            {children}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-600" />
        </div>
        {error && <p className="text-xs font-medium text-danger-400">{error}</p>}
      </div>
    )
  },
)
Select.displayName = 'Select'
