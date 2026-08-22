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

/** O hover ESCURECE (500 -> 600), não clareia.
 *
 *  Clareando, o rótulo branco perdia contraste justamente sob o cursor:
 *  brand caía de 4.84:1 para 3.28:1 e danger de 4.19:1 para 2.77:1 — abaixo do
 *  mínimo 4.5:1 da WCAG AA para o texto de 14px destes botões. Escurecendo, o
 *  hover melhora a leitura em vez de degradá-la (brand 6.85:1, danger 6.31:1).
 *
 *  `danger` também sobe o repouso para o degrau 600: em 500 o branco dava
 *  4.19:1, ou seja, o botão de confirmar exclusão já nascia reprovado.
 *
 *  `disabled` usa surface sólido em vez de alpha da cor: `bg-brand-500/40`
 *  composto sobre um card branco deixava o rótulo em 1.79:1 no tema claro —
 *  praticamente invisível. */
const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-surface-300 disabled:text-surface-600',
  secondary: 'bg-surface-200 text-surface-800 hover:bg-surface-300 active:bg-surface-400 disabled:opacity-40',
  ghost: 'bg-transparent text-surface-700 hover:bg-surface-200/60 hover:text-surface-900 active:bg-surface-200',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-700 disabled:bg-surface-300 disabled:text-surface-600',
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
