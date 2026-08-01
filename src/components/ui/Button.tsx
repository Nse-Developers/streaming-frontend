import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-400 active:bg-brand-600 disabled:bg-brand-500/40',
  secondary: 'bg-surface-200 text-surface-800 hover:bg-surface-300 active:bg-surface-400 disabled:opacity-40',
  ghost: 'bg-transparent text-surface-700 hover:bg-surface-200/60 hover:text-surface-900 active:bg-surface-200',
  danger: 'bg-danger-500 text-white hover:bg-danger-400 active:bg-danger-600 disabled:bg-danger-500/40',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-11 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap font-display font-semibold tracking-tight transition-colors duration-150 disabled:cursor-not-allowed focus-ring',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {isLoading && <Spinner size={16} className="text-current" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
