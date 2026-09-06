import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/Spinner'
import { AuthWall } from './AuthWall'
import { AuthWallBackdrop } from './AuthWallBackdrop'
import { NotFoundPage } from '@/pages/NotFoundPage'

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
      <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-live="polite">
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

/** Barreira de sessão. Visitante NÃO é mais redirecionado ao login: recebe o
 *  AuthWall, que mantém a tela pedida atrás de um desfoque.
 *
 *  Desde que `GET /video` virou público, a home abre sem sessão — o visitante
 *  navega pelo app e chega aqui CLICANDO, não por engano. Trocar a tela dele
 *  por um formulário de login nesse momento apaga o contexto todo e parece
 *  expulsão; o aviso sobre a própria tela explica o que falta.
 *
 *  O que continua fechado é o que importa: `GET /video/{id}`, `/auth/me` e o
 *  upload seguem exigindo token no backend. Este componente só escolhe o que
 *  desenhar — o conteúdo privado nunca chega ao navegador de um visitante. */
function AuthGate({
  wall,
  children,
}: {
  wall: React.ReactNode
  children?: React.ReactNode
}) {
  const { isAuthenticated, isReady } = useAuth()

  if (!isReady) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-live="polite">
        <Spinner size={28} />
        <span className="sr-only">Verificando sua sessão…</span>
      </div>
    )
  }

  if (!isAuthenticated) return <>{wall}</>

  return children ? <>{children}</> : <Outlet />
}

/** Exige sessão ativa. Sem login, mostra a parede de login sobre a tela pedida. */
export function RequireAuth({ children }: { children?: React.ReactNode }) {
  return (
    <AuthGate
      wall={
        <AuthWall
          title="Entre para continuar"
          description="Esta parte do Byou é só para quem tem conta. Entre para assistir aos vídeos, comentar e ter seu perfil."
          backdrop={<AuthWallBackdrop variant="profile" />}
        />
      }
    >
      {children}
    </AuthGate>
  )
}

/** Barreira do player. `GET /video/{id}` é a rota que continua privada — a
 *  LISTA (`GET /video`) é pública, então o visitante VÊ as capas na home e
 *  descobre o limite exatamente ao clicar. É o momento em que o pedido de
 *  login faz mais sentido, e o texto diz o que ele ganha ao entrar. */
export function RequireAuthPlayer({ children }: { children?: React.ReactNode }) {
  return (
    <AuthGate
      wall={
        <AuthWall
          title="Entre para assistir"
          description="A lista de vídeos é aberta, mas para dar play é preciso ter conta. Entre e continue de onde parou."
          backdrop={<AuthWallBackdrop variant="player" />}
        />
      }
    >
      {children}
    </AuthGate>
  )
}

/** Igual a RequireAuth, com o texto e o esqueleto de uma tela de FORMULÁRIO.
 *  Existe separado porque o visitante que clica em "Enviar vídeo" está atrás de
 *  outra coisa, e um aviso genérico sobre "assistir" não responde a ele. */
export function RequireAuthUpload({ children }: { children?: React.ReactNode }) {
  return (
    <AuthGate
      wall={
        <AuthWall
          title="Entre para enviar vídeos"
          description="Publicar no Byou exige uma conta de Criador. Entre para continuar — ou crie sua conta, leva menos de um minuto."
          backdrop={<AuthWallBackdrop variant="form" />}
        />
      }
    >
      {children}
    </AuthGate>
  )
}

/** Exige papel CREATORS (ou ADMIN) — espelha hasAnyRole("CREATORS","ADMIN")
 *  em POST /video/upload. Logado mas sem o papel -> /403, não /login:
 *  mandar para o login sugeriria que trocar de conta resolve. Visitante cai no
 *  AuthWall de upload, porque para ele o que falta é justamente a conta. */
export function RequireCreator({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, isCreator, isReady } = useAuth()

  if (isReady && !isAuthenticated) return <RequireAuthUpload>{children}</RequireAuthUpload>

  return (
    <GuardShell allowed={isAuthenticated && isCreator} redirectTo="/403">
      {children}
    </GuardShell>
  )
}

/** Exige ADMIN — espelha hasRole("ADMIN") em GET /auth/users.
 *
 *  Visitante NÃO recebe AuthWall aqui: um aviso dizendo "entre para acessar a
 *  administração" confirma que a área existe e convida a tentar. Para quem não
 *  tem sessão, /admin responde como qualquer URL inexistente — o mesmo 404 de
 *  uma rota qualquer, sem pista de que há algo do outro lado. */
export function RequireAdmin({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isReady } = useAuth()

  // Renderiza o 404 no lugar, sem redirect: a URL continua /admin (um pulo
  // para outro caminho já delataria que a rota é tratada de forma especial).
  if (isReady && !isAuthenticated) return <NotFoundPage />

  return (
    <GuardShell allowed={isAuthenticated && isAdmin} redirectTo="/403">
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
      <div className="flex min-h-dvh items-center justify-center bg-surface-0">
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
