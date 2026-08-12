import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Spinner'

/** Guard base. Enquanto a sessão não foi lida do storage, não decide nada —
 *  redirecionar aqui jogaria o usuário para o login a cada F5. */
function GuardShell({
  allowed,
  redirectTo,
  children,
}: {
  allowed: boolean
  redirectTo: string
  children?: React.ReactNode
}) {
  const { isReady } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
        <Spinner size={28} />
        <span className="sr-only">Verificando sua sessão…</span>
      </div>
    )
  }

  if (!allowed) {
    // `from` permite voltar ao destino original depois do login; `reason` deixa
    // a página de destino explicar o que aconteceu em vez de falhar em silêncio.
    return <Navigate to={redirectTo} replace state={{ from: location.pathname + location.search }} />
  }

  return children ? <>{children}</> : <Outlet />
}

/** Exige sessão ativa. Sem login -> /login com aviso. */
export function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return (
    <GuardShell allowed={isAuthenticated} redirectTo="/login">
      {children}
    </GuardShell>
  )
}

/** Exige papel CREATORS (ou ADMIN) — espelha hasAnyRole("CREATORS","ADMIN")
 *  em POST /video/upload. Logado mas sem o papel -> /403, não /login:
 *  mandar para o login sugeriria que trocar de conta resolve. */
export function RequireCreator({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, isCreator } = useAuth()
  return (
    <GuardShell allowed={isAuthenticated && isCreator} redirectTo={isAuthenticated ? '/403' : '/login'}>
      {children}
    </GuardShell>
  )
}

/** Exige ADMIN — espelha hasRole("ADMIN") em GET /auth/users. */
export function RequireAdmin({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth()
  return (
    <GuardShell allowed={isAuthenticated && isAdmin} redirectTo={isAuthenticated ? '/403' : '/login'}>
      {children}
    </GuardShell>
  )
}

/** Inverso: quem já está logado não deve ver /login ou /register. */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0">
        <Spinner size={28} />
      </div>
    )
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  }

  return <>{children}</>
}
