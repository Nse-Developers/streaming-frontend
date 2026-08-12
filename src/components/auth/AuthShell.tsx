import { Link } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'

/** Moldura das telas de autenticação: cartão único e centrado, sem painel de
 *  marketing. Quem chega aqui já decidiu entrar — texto institucional ao lado
 *  do formulário só aumenta o caminho até o campo de e-mail. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-4 py-10 sm:px-6">
      <main className={wide ? 'w-full max-w-lg' : 'w-full max-w-[400px]'}>
        <div className="mb-8 flex justify-center">
          <Link to="/" className="rounded-md focus-ring" aria-label="Byou — início">
            <Logo className="text-[1.7rem]" />
          </Link>
        </div>

        <div className="rounded-2xl border border-surface-200 bg-surface-100 p-6 sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-surface-900">
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 text-sm text-surface-600">{subtitle}</p>}

          <div className="mt-7">{children}</div>
        </div>

        <div className="mt-6 text-center text-sm text-surface-600">{footer}</div>
      </main>
    </div>
  )
}
