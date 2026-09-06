import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  RedirectIfAuthenticated,
  RequireAdmin,
  RequireAuth,
  RequireCreator,
} from '@/components/auth/RouteGuards'
import { Spinner } from '@/components/ui/Spinner'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { VideoPage } from '@/pages/VideoPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { UserProfilePage } from '@/pages/UserProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { LandingPage } from '@/pages/LandingPage'

/** Telas carregadas SÓ quando a rota é aberta.
 *
 *  Estas duas estão atrás de um guard de papel, então a maioria dos visitantes
 *  nunca as abre — mas o código ia no mesmo arquivo para todo mundo. AdminPage
 *  é a maior tela do app (28 KB de fonte, mais o que ela arrasta de
 *  formulário/modal) e só ADMIN chega nela; UploadPage só CREATORS.
 *
 *  O import dinâmico é o que faz o Vite emitir um chunk separado. Login, home e
 *  vídeo ficam estáticos de propósito: são o caminho de entrada, e adiar o
 *  código deles só adicionaria um ida-e-volta de rede antes da primeira tela. */
const UploadPage = lazy(() =>
  import('@/pages/UploadPage').then((m) => ({ default: m.UploadPage })),
)
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })))

/** Fallback enquanto o chunk da rota chega. Ocupa a altura de uma tela para o
 *  layout não "pular" quando o conteúdo entra. */
function RouteFallback() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center" role="status" aria-live="polite">
      <Spinner size={28} />
      <span className="sr-only">Carregando…</span>
    </div>
  )
}

/** Toda rota privada passa por um guard.
 *
 *  Acessar a URL direto (colando no navegador) cai na mesma checagem: sem
 *  sessão vai para /login guardando o destino; com sessão mas sem o papel
 *  necessário vai para /403 com explicação. Os guards espelham as regras do
 *  SecurityConfig do backend — a autorização real continua sendo do servidor.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthenticated>
            <RegisterPage />
          </RedirectIfAuthenticated>
        }
      />

      <Route element={<AppLayout withSearch />}>
        {/* Home exige sessão: GET /video hoje falha sem token. */}
        <Route element={<RequireAuth />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/videos/:id" element={<VideoPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Perfil público de outra pessoa. RequireAuth basta: a rota do
              backend (GET /auth/user/{id}) libera para CREATORS e VIEWERS, que
              juntos são todos os usuários autenticados — não há papel logado
              que deva cair no 403 aqui. */}
          <Route path="/users/:id" element={<UserProfilePage />} />
        </Route>

        {/* Espelha POST /video/upload -> hasAnyRole("CREATORS","ADMIN") */}
        <Route element={<RequireCreator />}>
          <Route
            path="/upload"
            element={
              <Suspense fallback={<RouteFallback />}>
                <UploadPage />
              </Suspense>
            }
          />
        </Route>

        {/* Espelha GET /auth/users -> hasRole("ADMIN") */}
        <Route element={<RequireAdmin />}>
          <Route
            path="/admin"
            element={
              <Suspense fallback={<RouteFallback />}>
                <AdminPage />
              </Suspense>
            }
          />
        </Route>

        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
